import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = (session as any).familyId as string | undefined;

  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 403 });
  }

  const { id } = await params;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const child = await prisma.child.findUnique({
    where: { id },
    include: {
      dailyTargets: true,
      mealLogs: {
        where: {
          date: { gte: todayStart, lte: todayEnd },
        },
        include: { nutrients: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!child || child.familyId !== familyId) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Build targets map
  const targets: Record<string, { target: number; unit: string }> = {};
  for (const dt of child.dailyTargets) {
    targets[dt.nutrient] = { target: dt.target, unit: dt.unit };
  }

  // Aggregate today's intake
  const todayIntake: Record<string, { amount: number; unit: string }> = {};
  for (const meal of child.mealLogs) {
    for (const entry of meal.nutrients) {
      if (todayIntake[entry.nutrient]) {
        todayIntake[entry.nutrient].amount += entry.amount;
      } else {
        todayIntake[entry.nutrient] = { amount: entry.amount, unit: entry.unit };
      }
    }
  }

  // Build meal list with full nutrition per meal
  const todayMeals = child.mealLogs.map((meal) => ({
    id: meal.id,
    mealType: meal.mealType,
    title: meal.title ?? null,
    description: meal.description,
    createdAt: meal.createdAt.toISOString(),
    confidence: meal.confidence,
    nutrients: meal.nutrients.map((n) => ({
      nutrient: n.nutrient,
      amount: n.amount,
      unit: n.unit,
    })),
  }));

  return NextResponse.json({
    id: child.id,
    name: child.name,
    age: calculateAge(child.dateOfBirth),
    photoUrl: child.photoUrl,
    gender: child.gender,
    heightCm: child.heightCm,
    weightKg: child.weightKg,
    activityProfile: child.activityProfile,
    goals: child.goals,
    targets,
    todayIntake,
    todayMeals,
  });
}