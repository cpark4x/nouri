import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateTargets, buildProfile } from "@/lib/targets/calculate";

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

  // ── Recalculate DailyTargets when physical or activity fields change ──
  const activityChanged =
    activityProfile !== undefined &&
    JSON.stringify(activityProfile) !== JSON.stringify(child.activityProfile);

  if (heightChanged || weightChanged || activityChanged) {
    const newTargets = calculateTargets(buildProfile(updated));

    await Promise.all(
      newTargets.map((t) =>
        prisma.dailyTarget.upsert({
          where: { childId_nutrient: { childId: id, nutrient: t.nutrient } },
          update: { target: t.amount, unit: t.unit },
          create: {
            childId: id,
            nutrient: t.nutrient,
            target: t.amount,
            unit: t.unit,
          },
        })
      )
    );
  }

  return NextResponse.json(updated);
}
