import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ParsedMeal, NutritionEstimate } from "@/lib/ai/types";

type NutrientKey = keyof NutritionEstimate;

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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = (session as any).familyId as string | undefined;
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 400 });
  }

  const body = await request.json();
  const { childId, mealType, description, parsedMeal, photoUrl } = body as {
    childId: string;
    mealType: string;
    description: string;
    parsedMeal: ParsedMeal;
    photoUrl?: string;
  };

  if (!childId || !mealType || !description || !parsedMeal) {
    return NextResponse.json(
      { error: "childId, mealType, description, and parsedMeal are required" },
      { status: 400 },
    );
  }

  // Verify child belongs to family
  const child = await prisma.child.findUnique({
    where: { id: childId },
  });

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

  // Create MealLog with nested NutritionEntry records
  const mealLog = await prisma.mealLog.create({
    data: {
      childId,
      mealType,
      description,
      photoUrl: photoUrl ?? null,
      confidence: parsedMeal.confidence,
      aiAnalysis: parsedMeal as any,
      nutrients: {
        create: nutritionData,
      },
    },
  });

  return NextResponse.json({ id: mealLog.id });
}