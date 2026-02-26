import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
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

  const { id: recipeId } = await params;

  // Verify recipe belongs to this family
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe || recipe.familyId !== familyId) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const body = await request.json();
  const { childId, rating, notes } = body as {
    childId: string;
    rating: string;
    notes?: string;
  };

  if (!childId || !rating) {
    return NextResponse.json(
      { error: "childId and rating are required" },
      { status: 400 },
    );
  }

  const validRatings = ["loved", "ate_it", "didnt_eat"];
  if (!validRatings.includes(rating)) {
    return NextResponse.json(
      { error: "Invalid rating. Must be loved, ate_it, or didnt_eat" },
      { status: 400 },
    );
  }

  const childRating = await prisma.recipeChildRating.upsert({
    where: { recipeId_childId: { recipeId, childId } },
    update: { rating, notes: notes ?? null },
    create: { recipeId, childId, rating, notes: notes ?? null },
  });

  return NextResponse.json({ childRating });
}
