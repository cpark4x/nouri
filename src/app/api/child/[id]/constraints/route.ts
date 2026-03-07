import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function verifyChildAccess(childId: string, familyId: string) {
  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child || child.familyId !== familyId) return null;
  return child;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  if (!(await verifyChildAccess(id, familyId))) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const constraints = await prisma.ingredientConstraint.findMany({
    where: { childId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(constraints);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  if (!(await verifyChildAccess(id, familyId))) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const body = await request.json();
  const { ingredient, reason, severity } = body as {
    ingredient?: string;
    reason?: string;
    severity?: string;
  };

  if (!ingredient || typeof ingredient !== "string" || !ingredient.trim()) {
    return NextResponse.json(
      { error: "ingredient is required" },
      { status: 400 },
    );
  }

  const constraint = await prisma.ingredientConstraint.create({
    data: {
      childId: id,
      ingredient: ingredient.trim(),
      reason: reason?.trim() || null,
      severity: severity?.trim() || "avoid",
    },
  });

  return NextResponse.json(constraint, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  if (!(await verifyChildAccess(id, familyId))) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const constraintId = searchParams.get("id");

  if (!constraintId) {
    return NextResponse.json(
      { error: "Constraint id is required" },
      { status: 400 },
    );
  }

  // Verify the constraint belongs to this child
  const constraint = await prisma.ingredientConstraint.findUnique({
    where: { id: constraintId },
  });
  if (!constraint || constraint.childId !== id) {
    return NextResponse.json(
      { error: "Constraint not found" },
      { status: 404 },
    );
  }

  await prisma.ingredientConstraint.delete({ where: { id: constraintId } });

  return NextResponse.json({ success: true });
}
