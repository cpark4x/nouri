import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ai } from "@/lib/ai/router";
import { validateDescription, buildNutritionEntries } from "./logic";

// ── GET /api/log/[mealLogId] ──────────────────────────────────────────────────
// Returns a single meal log with its nutrients.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mealLogId: string }> },
) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 403 });
  }

  const { mealLogId } = await params;

  // ── Fetch meal log with ownership check ───────────────────────────────────
  let mealLog;
  try {
    mealLog = await prisma.mealLog.findUnique({
      where: { id: mealLogId },
      include: {
        nutrients: true,
        child: true,
      },
    });
  } catch (error) {
    console.error("Database error fetching meal log:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!mealLog) {
    return NextResponse.json({ error: "Meal log not found" }, { status: 404 });
  }

  if (mealLog.child.familyId !== familyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: mealLog.id,
    mealType: mealLog.mealType,
    description: mealLog.description,
    createdAt: mealLog.createdAt.toISOString(),
    confidence: mealLog.confidence,
    nutrients: mealLog.nutrients.map((n) => ({
      nutrient: n.nutrient,
      amount: n.amount,
      unit: n.unit,
    })),
  });
}

// ── PUT /api/log/[mealLogId] ──────────────────────────────────────────────────
// Re-parses a meal with updated description and replaces nutrition entries.

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ mealLogId: string }> },
) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 403 });
  }

  const { mealLogId } = await params;

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: { description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const descriptionError = validateDescription(body.description);
  if (descriptionError) {
    return NextResponse.json({ error: descriptionError }, { status: 400 });
  }

  const description = (body.description as string).trim();

  // ── Fetch meal log with child context (ownership check) ───────────────────
  let mealLog;
  try {
    mealLog = await prisma.mealLog.findUnique({
      where: { id: mealLogId },
      include: {
        child: { include: { foodPreferences: true } },
      },
    });
  } catch (error) {
    console.error("Database error fetching meal log for update:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!mealLog) {
    return NextResponse.json({ error: "Meal log not found" }, { status: 404 });
  }

  if (mealLog.child.familyId !== familyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── Build child context for AI (mirrors parse/route.ts) ───────────────────
  const child = mealLog.child;
  const ageMs = Date.now() - new Date(child.dateOfBirth).getTime();
  const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));

  const childContext = {
    name: child.name,
    age: ageYears,
    gender: child.gender,
    weightKg: child.weightKg,
    heightCm: child.heightCm,
    activityProfile: child.activityProfile,
    goals: child.goals,
    foodPreferences: child.foodPreferences.map((fp) => ({
      food: fp.food,
      rating: fp.rating,
      notes: fp.notes,
    })),
  };

  // ── Re-parse with AI ──────────────────────────────────────────────────────
  let parsed;
  try {
    parsed = await ai.parseFoodDescription(description, childContext);
  } catch (error) {
    console.error("AI parse error during meal edit:", error);
    return NextResponse.json(
      { error: "Failed to analyze meal. Please try again." },
      { status: 500 },
    );
  }

  // ── Transactional update: delete old nutrition, update log, insert new ─────
  const nutritionData = buildNutritionEntries(parsed.totalNutrition);

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      // a. Delete existing nutrition entries
      await tx.nutritionEntry.deleteMany({ where: { mealLogId } });

      // b. Update the MealLog
      const log = await tx.mealLog.update({
        where: { id: mealLogId },
        data: {
          description,
          confidence: parsed.confidence,
          aiAnalysis: parsed as any,
          updatedAt: new Date(),
        },
      });

      // c. Create new nutrition entries
      await tx.nutritionEntry.createMany({
        data: nutritionData.map((n) => ({ ...n, mealLogId })),
      });

      return log;
    });
  } catch (error) {
    console.error("Database transaction error during meal update:", error);
    return NextResponse.json({ error: "Failed to save updated meal" }, { status: 500 });
  }

  // ── Fetch updated nutrients and return ────────────────────────────────────
  // Note: the in-memory tipCache in the tip route will serve a stale tip until
  // the component re-mounts (tipFetched resets on re-render), at which point
  // a fresh tip is generated for the updated meal.
  const updatedNutrients = await prisma.nutritionEntry.findMany({
    where: { mealLogId },
  });

  return NextResponse.json({
    id: updated.id,
    mealType: updated.mealType,
    description: updated.description,
    createdAt: updated.createdAt.toISOString(),
    confidence: updated.confidence,
    nutrients: updatedNutrients.map((n) => ({
      nutrient: n.nutrient,
      amount: n.amount,
      unit: n.unit,
    })),
  });
}
