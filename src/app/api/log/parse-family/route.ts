import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ai } from "@/lib/ai/router";
import type { ParsedMeal } from "@/lib/ai/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = (session as any).familyId as string | undefined;
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 400 });
  }

  const body = await request.json();
  const { description, mealType } = body as {
    description: string;
    mealType: string;
  };

  if (!description || !mealType) {
    return NextResponse.json(
      { error: "description and mealType are required" },
      { status: 400 },
    );
  }

  // Fetch all children in the family with their contexts
  const children = await prisma.child.findMany({
    where: { familyId },
    include: { foodPreferences: true },
    orderBy: { dateOfBirth: "asc" },
  });

  if (children.length === 0) {
    return NextResponse.json(
      { error: "No children found in family" },
      { status: 404 },
    );
  }

  // Parse meal for each child in parallel — separate AI calls with child-specific context
  try {
    const results = await Promise.all(
      children.map(async (child) => {
        const now = new Date();
        const ageMs = now.getTime() - new Date(child.dateOfBirth).getTime();
        const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));

        const childContext = {
          name: child.name,
          age: ageYears,
          gender: child.gender,
          weightKg: child.weightKg,
          heightCm: child.heightCm,
          activityProfile: child.activityProfile,
          goals: child.goals,
          foodPreferences: child.foodPreferences.map((fp) => ({
            food: fp.food,
            rating: fp.rating,
            notes: fp.notes,
          })),
        };

        // Prepend child-specific context so AI adjusts portions for age/size
        const contextualDescription = `This meal is for ${child.name}, age ${ageYears}, weighing ${child.weightKg ?? "unknown"}kg. ${description}`;

        const parsedMeal: ParsedMeal = await ai.parseFoodDescription(
          contextualDescription,
          childContext,
        );

        return {
          childId: child.id,
          childName: child.name,
          parsedMeal,
        };
      }),
    );

    return NextResponse.json({ children: results });
  } catch (error) {
    console.error("AI parse error (family):", error);
    return NextResponse.json(
      { error: "Failed to analyze meal. Please try again." },
      { status: 500 },
    );
  }
}