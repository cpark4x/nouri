import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ParsedMeal, NutritionEstimate } from "@/lib/ai/types";
import { normalizeMealType } from "./normalize-meal-type";
import { calculatePoints } from "@/lib/gamification/points";
import { checkAchievements } from "@/lib/gamification/achievements";

type NutrientKey = keyof NutritionEstimate;

const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TITLE_LENGTH = 200;
const VALID_CONFIDENCE = new Set<string>(["high", "medium", "low"]);

const NUTRIENT_UNITS: Record<NutrientKey, string> = {
  calories: "kcal",
  protein: "g",
  calcium: "mg",
  vitaminD: "IU",
  iron: "mg",
  zinc: "mg",
  magnesium: "mg",
  potassium: "mg",
  vitaminA: "mcg",
  vitaminC: "mg",
  fiber: "g",
  omega3: "mg",
};

/** Returns true when the child has logged meals on ≥7 consecutive days ending today. */
async function checkStreakActive(
  childId: string,
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const logs = await tx.mealLog.findMany({
    where: { childId, date: { gte: cutoff } },
    select: { date: true },
  });

  const daysWithMeals = new Set(
    logs.map((l) => l.date.toISOString().split("T")[0]),
  );

  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 7; i++) {
    const key = cursor.toISOString().split("T")[0];
    if (daysWithMeals.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak >= 7;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 400 });
  }

  let body: {
    childId: string;
    description: string;
    parsedMeal: ParsedMeal;
    photoUrl?: string;
    mealType?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { childId, description, parsedMeal, photoUrl } = body;

  // Validate all required fields before any DB access
  if (!childId || !description || !parsedMeal) {
    return NextResponse.json(
      { error: "childId, mealType, description, and parsedMeal are required" },
      { status: 400 },
    );
  }

  const trimmedDescription = description.trim();
  const title = parsedMeal.title?.trim() ?? null;

  if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `description exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters` },
      { status: 400 },
    );
  }

  if (title && title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `parsedMeal.title exceeds maximum length of ${MAX_TITLE_LENGTH} characters` },
      { status: 400 },
    );
  }

  const mealType = normalizeMealType(body.mealType);
  if (!mealType) {
    return NextResponse.json(
      { error: "Invalid mealType. Must be one of: breakfast, lunch, snack, dinner" },
      { status: 400 },
    );
  }

  if (!parsedMeal.totalNutrition) {
    return NextResponse.json(
      { error: "parsedMeal.totalNutrition is missing" },
      { status: 400 },
    );
  }

  if (!VALID_CONFIDENCE.has(parsedMeal.confidence)) {
    return NextResponse.json(
      { error: "parsedMeal.confidence must be one of: high, medium, low" },
      { status: 400 },
    );
  }

  // Verify child belongs to family (outside transaction — fast auth check)
  let child;
  try {
    child = await prisma.child.findUnique({ where: { id: childId } });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!child || child.familyId !== familyId) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Build nutrition entries from parsed meal
  const nutrientKeys = Object.keys(NUTRIENT_UNITS) as Array<
    keyof typeof NUTRIENT_UNITS
  >;
  const nutritionData = nutrientKeys
    .filter((key) => parsedMeal.totalNutrition[key] > 0)
    .map((key) => ({
      nutrient: key,
      amount: parsedMeal.totalNutrition[key],
      unit: NUTRIENT_UNITS[key],
    }));

  // Run meal save + gamification in a single transaction
  let result: {
    mealId: string;
    pointsDelta: number;
    newBadgeKeys: string[];
    completedMilestones: string[];
  };

  try {
    result = await prisma.$transaction(async (tx) => {
      // 1. Save MealLog with nested NutritionEntry records
      const meal = await tx.mealLog.create({
        data: {
          childId,
          mealType,
          description: trimmedDescription,
          title,
          photoUrl: photoUrl ?? null,
          confidence: parsedMeal.confidence,
          aiAnalysis: JSON.parse(JSON.stringify(parsedMeal)) as object,
          nutrients: {
            create: nutritionData,
          },
        },
      });

      // 2. Gamification — wrapped in try/catch; must NOT block the meal save
      let pointsDelta = 0;
      let newBadgeKeys: string[] = [];
      const completedMilestones: string[] = [];

      try {
        const currentChild = await tx.child.findUniqueOrThrow({
          where: { id: childId },
        });
        const dailyTargets = await tx.dailyTarget.findMany({
          where: { childId },
        });
        const calorieTarget =
          dailyTargets.find((t) => t.nutrient === "calories")?.target ?? 0;
        const hasActiveStreak = await checkStreakActive(childId, tx);

        // Points calculation
        const points = calculatePoints({
          meal: {
            nutritionData: {
              calories: parsedMeal.totalNutrition.calories ?? 0,
            },
          },
          child: {
            points: currentChild.points,
            todayMealCount: 1,
          },
          dailyTargets: { calories: calorieTarget },
          hasActiveStreak,
        });
        pointsDelta = points.total;

        await tx.child.update({
          where: { id: childId },
          data: { points: { increment: pointsDelta } },
        });

        // Achievement checks
        newBadgeKeys = await checkAchievements(childId, tx);
        if (newBadgeKeys.length > 0) {
          const achievements = await tx.achievement.findMany({
            where: { key: { in: newBadgeKeys } },
          });
          await tx.childAchievement.createMany({
            data: achievements.map((a) => ({
              childId,
              achievementId: a.id,
            })),
            skipDuplicates: true,
          });
        }

        // Milestone goal progress
        const activeGoals = await tx.milestoneGoal.findMany({
          where: { childId, completedAt: null },
        });
        for (const goal of activeGoals) {
          const newCount = goal.currentCount + 1;
          const completed = newCount >= goal.targetCount;
          await tx.milestoneGoal.update({
            where: { id: goal.id },
            data: {
              currentCount: newCount,
              completedAt: completed ? new Date() : null,
            },
          });
          if (completed) completedMilestones.push(goal.description);
        }
      } catch (err) {
        console.error("[gamification] error during meal save:", err);
        // Do not rethrow — meal save succeeds regardless
      }

      return {
        mealId: meal.id,
        pointsDelta,
        newBadgeKeys,
        completedMilestones,
      };
    });
  } catch {
    return NextResponse.json({ error: "Failed to save meal log" }, { status: 500 });
  }

  return NextResponse.json({
    id: result.mealId,
    gamification: {
      pointsEarned: result.pointsDelta,
      newBadges: result.newBadgeKeys,
      completedMilestones: result.completedMilestones,
    },
  });
}
