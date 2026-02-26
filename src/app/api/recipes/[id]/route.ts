import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { childRatings: true },
  });

  if (!recipe || recipe.familyId !== familyId) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  return NextResponse.json({ recipe });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing || existing.familyId !== familyId) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title, instructions, ingredients, nutritionPerServing, tags, familyRating } =
    body as {
      title?: string;
      instructions?: string;
      ingredients?: unknown;
      nutritionPerServing?: Record<string, number>;
      tags?: string[];
      familyRating?: string;
    };

  const recipe = await prisma.recipe.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(instructions !== undefined ? { instructions } : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(ingredients !== undefined ? { ingredients: ingredients as any } : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(nutritionPerServing !== undefined ? { nutritionPerServing: nutritionPerServing as any } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(familyRating !== undefined ? { familyRating } : {}),
    },
    include: { childRatings: true },
  });

  return NextResponse.json({ recipe });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing || existing.familyId !== familyId) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  await prisma.recipe.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
