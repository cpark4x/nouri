import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 400 });
  }

  const { id: childId } = await params;

  // Verify the child belongs to the parent's family
  let child;
  try {
    child = await prisma.child.findUnique({ where: { id: childId } });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!child || child.familyId !== familyId) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  let body: { description: string; targetCount: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { description, targetCount } = body;

  if (!description || typeof description !== "string" || !description.trim()) {
    return NextResponse.json(
      { error: "description is required" },
      { status: 400 },
    );
  }

  if (
    typeof targetCount !== "number" ||
    !Number.isInteger(targetCount) ||
    targetCount < 1
  ) {
    return NextResponse.json(
      { error: "targetCount must be a positive integer" },
      { status: 400 },
    );
  }

  try {
    const goal = await prisma.milestoneGoal.create({
      data: {
        childId,
        createdByParentId: session.userId,
        description: description.trim(),
        targetCount,
      },
    });

    return NextResponse.json({ id: goal.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create milestone goal" },
      { status: 500 },
    );
  }
}
