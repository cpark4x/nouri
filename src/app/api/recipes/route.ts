import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;

  if (!familyId) {
    return NextResponse.json({ recipes: [] });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  const recipes = await prisma.recipe.findMany({
    where: {
      familyId,
      ...(search
        ? { title: { contains: search, mode: "insensitive" } }
        : {}),
    },
    include: { childRatings: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ recipes });
}

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
  const {
    title,
    description,
    instructions,
    ingredients,
    nutritionPerServing,
    tags,
    sourceName,
  } = body as {
    title: string;
    description?: string;
    instructions?: string;
    ingredients?: unknown;
    nutritionPerServing?: Record<string, number>;
    tags?: string[];
    sourceName?: string;
  };

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const recipe = await prisma.recipe.create({
    data: {
      familyId,
      title,
      description: description ?? null,
      instructions: instructions ?? null,
      ingredients: ingredients ?? undefined,
      nutritionPerServing: nutritionPerServing ?? undefined,
      tags: tags ?? [],
      sourceName: sourceName ?? null,
    },
    include: { childRatings: true },
  });

  return NextResponse.json({ recipe }, { status: 201 });
}
