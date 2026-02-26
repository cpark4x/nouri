import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

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

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = (session as any).familyId as string | undefined;

  if (!familyId) {
    return NextResponse.json({ children: [] });
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const children = await prisma.child.findMany({
    where: { familyId },
    include: {
      dailyTargets: true,
      mealLogs: {
        where: {
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        include: {
          nutrients: true,
        },
      },
    },
    orderBy: { dateOfBirth: "asc" },
  });

  const result = children.map((child) => {
    // Build targets map
    const targets: Record<string, { target: number; unit: string }> = {};
    for (const dt of child.dailyTargets) {
      targets[dt.nutrient] = { target: dt.target, unit: dt.unit };
    }

    // Aggregate today's nutrient intake across all meals
    const todayIntake: Record<string, { amount: number; unit: string }> = {};
    for (const meal of child.mealLogs) {
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

    // Build meal status
    const loggedMealTypes = new Set(
      child.mealLogs.map((m) => m.mealType.toLowerCase())
    );
    const todayMeals = MEAL_TYPES.map((mealType) => ({
      mealType,
      logged: loggedMealTypes.has(mealType),
      summary: child.mealLogs.find(
        (m) => m.mealType.toLowerCase() === mealType
      )?.description,
    }));

    return {
      id: child.id,
      name: child.name,
      age: calculateAge(child.dateOfBirth),
      photoUrl: child.photoUrl,
      targets,
      todayIntake,
      todayMeals,
    };
  });

  return NextResponse.json({ children: result });
}