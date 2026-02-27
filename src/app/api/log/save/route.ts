import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ParsedMeal, NutritionEstimate } from "@/lib/ai/types";
import { normalizeMealType } from "./normalize-meal-type";

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

  // Verify child belongs to family
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

  // Create MealLog with nested NutritionEntry records
  let mealLog;
  try {
    mealLog = await prisma.mealLog.create({
      data: {
        childId,
        mealType,
        description: trimmedDescription,
        title,
        photoUrl: photoUrl ?? null,
        confidence: parsedMeal.confidence,
        // Serialize to a plain object — ParsedMeal contains typed interfaces
        // that Prisma's InputJsonValue doesn't accept directly without a cast.
        aiAnalysis: JSON.parse(JSON.stringify(parsedMeal)) as object,
        nutrients: {
          create: nutritionData,
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to save meal log" }, { status: 500 });
  }

  return NextResponse.json({ id: mealLog.id });
}