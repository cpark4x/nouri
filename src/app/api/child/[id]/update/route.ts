import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/* ── Age-based RDA lookup (simplified for v1) ── */

function getBaseNutrients(ageYears: number, gender: string) {
  if (ageYears <= 3) {
    return {
      calories: { target: 1000, unit: "kcal" },
      protein: { target: 13, unit: "g" },
      fiber: { target: 14, unit: "g" },
      calcium: { target: 700, unit: "mg" },
      iron: { target: 7, unit: "mg" },
      vitaminD: { target: 15, unit: "mcg" },
      vitaminC: { target: 15, unit: "mg" },
      zinc: { target: 3, unit: "mg" },
    };
  }
  if (ageYears <= 8) {
    return {
      calories: { target: 1200, unit: "kcal" },
      protein: { target: 19, unit: "g" },
      fiber: { target: 20, unit: "g" },
      calcium: { target: 1000, unit: "mg" },
      iron: { target: 10, unit: "mg" },
      vitaminD: { target: 15, unit: "mcg" },
      vitaminC: { target: 25, unit: "mg" },
      zinc: { target: 5, unit: "mg" },
    };
  }
  if (ageYears <= 13) {
    const isMale = gender === "male";
    return {
      calories: { target: isMale ? 1800 : 1600, unit: "kcal" },
      protein: { target: 34, unit: "g" },
      fiber: { target: 25, unit: "g" },
      calcium: { target: 1300, unit: "mg" },
      iron: { target: 8, unit: "mg" },
      vitaminD: { target: 15, unit: "mcg" },
      vitaminC: { target: 45, unit: "mg" },
      zinc: { target: 8, unit: "mg" },
    };
  }
  // 14-18
  const isMale = gender === "male";
  return {
    calories: { target: isMale ? 2200 : 1800, unit: "kcal" },
    protein: { target: isMale ? 52 : 46, unit: "g" },
    fiber: { target: isMale ? 31 : 26, unit: "g" },
    calcium: { target: 1300, unit: "mg" },
    iron: { target: isMale ? 11 : 15, unit: "mg" },
    vitaminD: { target: 15, unit: "mcg" },
    vitaminC: { target: isMale ? 75 : 65, unit: "mg" },
    zinc: { target: isMale ? 11 : 9, unit: "mg" },
  };
}

function getActivityFactor(
  activityProfile: { sports?: { intensity?: string }[] } | null
): number {
  const sports = activityProfile?.sports;
  if (!sports?.length) return 1.2; // sedentary

  const avgIntensity =
    sports.reduce((sum, s) => {
      if (s.intensity === "high") return sum + 3;
      if (s.intensity === "moderate") return sum + 2;
      return sum + 1;
    }, 0) / sports.length;

  if (avgIntensity >= 2.5) return 1.7; // high
  if (avgIntensity >= 1.5) return 1.5; // moderate
  return 1.2; // sedentary
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 403 });
  }

  const { id } = await params;

  const child = await prisma.child.findUnique({ where: { id } });
  if (!child || child.familyId !== familyId) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const body = await request.json();
  const { heightCm, weightKg, activityProfile, goals, photoUrl } = body;

  // Build partial update
  const updateData: Record<string, unknown> = {};
  if (heightCm !== undefined) updateData.heightCm = heightCm;
  if (weightKg !== undefined) updateData.weightKg = weightKg;
  if (activityProfile !== undefined) updateData.activityProfile = activityProfile;
  if (goals !== undefined) updateData.goals = goals;
  if (photoUrl !== undefined) updateData.photoUrl = photoUrl;

  const updated = await prisma.child.update({
    where: { id },
    data: updateData,
  });

  // ── Track growth if height or weight changed ──
  const heightChanged = heightCm !== undefined && heightCm !== child.heightCm;
  const weightChanged = weightKg !== undefined && weightKg !== child.weightKg;

  if (heightChanged || weightChanged) {
    await prisma.healthRecord.create({
      data: {
        childId: id,
        type: "growth_measurement",
        date: new Date(),
        data: {
          heightCm: heightCm ?? child.heightCm,
          weightKg: weightKg ?? child.weightKg,
        },
      },
    });
  }

  // ── Recalculate DailyTargets if weight or activity changed significantly ──
  const activityChanged =
    activityProfile !== undefined &&
    JSON.stringify(activityProfile) !== JSON.stringify(child.activityProfile);

  if (weightChanged || activityChanged) {
    const currentWeight = (weightKg ?? child.weightKg) as number | null;
    const currentActivity = (activityProfile ?? child.activityProfile) as {
      sports?: { intensity?: string }[];
    } | null;

    if (currentWeight) {
      const ageMs = Date.now() - new Date(child.dateOfBirth).getTime();
      const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
      const baseNutrients = getBaseNutrients(ageYears, child.gender);
      const activityFactor = getActivityFactor(currentActivity);

      const targets: { nutrient: string; target: number; unit: string }[] = [];

      for (const [nutrient, value] of Object.entries(baseNutrients)) {
        let target = value.target;
        if (nutrient === "calories") {
          target = Math.round(target * activityFactor);
        } else if (nutrient === "protein") {
          target = Math.max(target, Math.round(currentWeight));
        }
        targets.push({ nutrient, target, unit: value.unit });
      }

      for (const t of targets) {
        await prisma.dailyTarget.upsert({
          where: {
            childId_nutrient: { childId: id, nutrient: t.nutrient },
          },
          update: { target: t.target, unit: t.unit },
          create: {
            childId: id,
            nutrient: t.nutrient,
            target: t.target,
            unit: t.unit,
          },
        });
      }
    }
  }

  return NextResponse.json(updated);
}
