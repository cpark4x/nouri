import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 400 });
  }

  const { id: childId } = await params;

  // Verify child belongs to the session's family
  let child;
  try {
    child = await prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, familyId: true, points: true },
    });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!child || child.familyId !== familyId) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  try {
    // All 12 badge definitions
    const allAchievements = await prisma.achievement.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Badges already earned by this child
    const earnedRows = await prisma.childAchievement.findMany({
      where: { childId },
      select: { achievementId: true, earnedAt: true },
    });
    const earnedMap = new Map(
      earnedRows.map((r) => [r.achievementId, r.earnedAt]),
    );

    const achievements = allAchievements.map((a) => ({
      key: a.key,
      name: a.name,
      description: a.description,
      iconRef: a.iconRef,
      earned: earnedMap.has(a.id),
      earnedAt: earnedMap.get(a.id) ?? null,
    }));

    // Active + recently completed milestone goals
    const milestoneGoals = await prisma.milestoneGoal.findMany({
      where: { childId },
      include: {
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const goals = milestoneGoals.map((g) => ({
      id: g.id,
      description: g.description,
      targetCount: g.targetCount,
      currentCount: g.currentCount,
      completedAt: g.completedAt,
      createdByName: g.createdBy.name ?? "Parent",
    }));

    return NextResponse.json({
      points: child.points,
      achievements,
      milestoneGoals: goals,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load gamification data" },
      { status: 500 },
    );
  }
}
