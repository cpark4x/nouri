import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ai } from "@/lib/ai/router";

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
  const { childId, imageUrl, mealType } = body as {
    childId: string;
    imageUrl: string;
    mealType: string;
  };

  if (!childId || !imageUrl || !mealType) {
    return NextResponse.json(
      { error: "childId, imageUrl, and mealType are required" },
      { status: 400 },
    );
  }

  // Fetch child and verify family ownership
  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: { foodPreferences: true },
  });

  if (!child || child.familyId !== familyId) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Build child context for AI
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

  // Fetch kitchen items for portion estimation
  const kitchenItems = await prisma.kitchenItem.findMany({
    where: { familyId },
    select: {
      name: true,
      type: true,
      estimatedDimensions: true,
    },
  });

  // Fetch image and convert to base64
  let imageBase64: string;
  try {
    let imageBuffer: Buffer;

    if (imageUrl.startsWith("/")) {
      // Local file — read from public directory
      const fs = await import("fs/promises");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", imageUrl);
      imageBuffer = Buffer.from(await fs.readFile(filePath));
    } else {
      // Remote URL — fetch it
      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) {
        throw new Error(`Failed to fetch image: ${imageRes.status}`);
      }
      imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    }

    imageBase64 = imageBuffer.toString("base64");
  } catch (error) {
    console.error("Image fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load image for analysis" },
      { status: 400 },
    );
  }

  try {
    const parsed = await ai.analyzeFoodPhoto(imageBase64, { childContext, kitchenItems });
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("AI photo parse error:", error);
    return NextResponse.json(
      { error: "Failed to analyze photo. Please try again." },
      { status: 500 },
    );
  }
}