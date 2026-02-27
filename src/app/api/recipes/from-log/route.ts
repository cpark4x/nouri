import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;

  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 400 });
  }

  const body = await request.json();
  const { mealLogId, title } = body as { mealLogId: string; title: string };

  if (!mealLogId || !title) {
    return NextResponse.json(
      { error: "mealLogId and title are required" },
      { status: 400 },
    );
  }

  // Fetch meal log with nutrients — verify it belongs to this family
  const mealLog = await prisma.mealLog.findUnique({
    where: { id: mealLogId },
    include: { nutrients: true, child: true },
  });

  if (!mealLog || mealLog.child.familyId !== familyId) {
    return NextResponse.json({ error: "Meal log not found" }, { status: 404 });
  }

  // Aggregate nutrition entries into nutritionPerServing object
  const nutritionPerServing: Record<string, number> = {};
  for (const entry of mealLog.nutrients) {
    nutritionPerServing[entry.nutrient] = entry.amount;
  }

  const recipe = await prisma.recipe.create({
    data: {
      familyId,
      title,
      sourceName: "Logged meal",
      nutritionPerServing,
    },
    include: { childRatings: true },
  });

  return NextResponse.json({ recipe }, { status: 201 });
}
