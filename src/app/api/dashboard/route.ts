import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ALLOWED_MEAL_TYPES } from "@/app/api/log/save/normalize-meal-type";
import {
  parseDateParam,
  buildDateWindow,
  calculateStreak,
} from "./logic";

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age--;
  }
  return age;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;

  if (!familyId) {
    return NextResponse.json({ children: [] });
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const targetDate = parseDateParam(dateParam);
  const { start, end } = buildDateWindow(targetDate);

  // Expand the lookback window to 30 days for streak calculation.
  // Today's meals are filtered in code; the extra days only provide dates.
  const thirtyDaysAgo = new Date(start.getTime() - 29 * 86_400_000);

  let children;
  try {
    children = await prisma.child.findMany({
      where: { familyId },
      include: {
        dailyTargets: true,
        mealLogs: {
          where: {
            date: {
              gte: thirtyDaysAgo,
              lt: end,
            },
          },
          include: {
            nutrients: true,
          },
        },
      },
      orderBy: { dateOfBirth: "asc" },
    });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const result = children.map((child) => {
    // Build targets map
    const targets: Record<string, { target: number; unit: string }> = {};
    for (const dt of child.dailyTargets) {
      targets[dt.nutrient] = { target: dt.target, unit: dt.unit };
    }

    // Filter to the requested date for nutrition display
    const todayMealLogs = child.mealLogs.filter(
      (m) => m.date >= start && m.date < end
    );

    // Aggregate the requested day's nutrient intake across all meals
    const todayIntake: Record<string, { amount: number; unit: string }> = {};
    for (const meal of todayMealLogs) {
      for (const entry of meal.nutrients) {
        if (todayIntake[entry.nutrient]) {
          todayIntake[entry.nutrient].amount += entry.amount;
        } else {
          todayIntake[entry.nutrient] = {
            amount: entry.amount,
            unit: entry.unit,
          };
        }
      }
    }

    // Build meal status from the requested day
    const loggedMealTypes = new Set(
      todayMealLogs.map((m) => m.mealType.toLowerCase())
    );
    const todayMeals = ALLOWED_MEAL_TYPES.map((mealType) => {
      const log = todayMealLogs.find(
        (m) => m.mealType.toLowerCase() === mealType
      );
      return {
        mealType,
        logged: loggedMealTypes.has(mealType),
        summary: log?.title ?? log?.description,
      };
    });

    // Gamification — points from DB, streak computed from last 30 days of logs
    const points = child.points;
    const streak = calculateStreak(child.mealLogs.map((m) => m.date));

    // Convenience calorie fields for the calories progress bar
    const todayCalories = todayIntake["calories"]?.amount ?? 0;
    const todayCaloriesTarget = targets["calories"]?.target ?? 0;

    return {
      id: child.id,
      name: child.name,
      age: calculateAge(child.dateOfBirth),
      photoUrl: child.photoUrl,
      points,
      streak,
      todayCalories,
      todayCaloriesTarget,
      targets,
      todayIntake,
      todayMeals,
    };
  });

  return NextResponse.json({ children: result });
}
