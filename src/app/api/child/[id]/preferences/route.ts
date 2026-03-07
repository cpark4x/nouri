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

  if (!await verifyChildAccess(id, familyId)) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const preferences = await prisma.foodPreference.findMany({
    where: { childId: id },
    orderBy: { food: "asc" },
  });

  return NextResponse.json(preferences);
}

export async function POST(
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

  if (!await verifyChildAccess(id, familyId)) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const body = await request.json();
  const { food, rating, notes } = body;

  if (!food || !rating) {
    return NextResponse.json(
      { error: "food and rating are required" },
      { status: 400 }
    );
  }

  // Case-insensitive match for existing preference
  const existing = await prisma.foodPreference.findFirst({
    where: {
      childId: id,
      food: { equals: food, mode: "insensitive" },
    },
  });

  let preference;
  if (existing) {
    preference = await prisma.foodPreference.update({
      where: { id: existing.id },
      data: { food, rating, notes: notes || null },
    });
  } else {
    preference = await prisma.foodPreference.create({
      data: {
        childId: id,
        food,
        rating,
        notes: notes || null,
      },
    });
  }

  return NextResponse.json(preference);
}

export async function DELETE(
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

  if (!await verifyChildAccess(id, familyId)) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const body = await request.json();
  const { id: preferenceId } = body;

  if (!preferenceId) {
    return NextResponse.json(
      { error: "Preference id is required" },
      { status: 400 }
    );
  }

  // Verify the preference belongs to this child
  const preference = await prisma.foodPreference.findUnique({
    where: { id: preferenceId },
  });
  if (!preference || preference.childId !== id) {
    return NextResponse.json(
      { error: "Preference not found" },
      { status: 404 }
    );
  }

  await prisma.foodPreference.delete({ where: { id: preferenceId } });

  return NextResponse.json({ success: true });
}
