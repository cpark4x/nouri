import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { analyzeKitchenItem } from "@/lib/ai/providers/kitchen-analyzer";

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;

  if (!familyId) {
    return NextResponse.json({ items: [] });
  }

  const items = await prisma.kitchenItem.findMany({
    where: { familyId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
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
  const { name, type, photoUrl } = body as {
    name: string;
    type: "plate" | "bowl" | "glass" | "cup";
    photoUrl?: string;
  };

  if (!name || !type) {
    return NextResponse.json(
      { error: "name and type are required" },
      { status: 400 },
    );
  }

  const validTypes = ["plate", "bowl", "glass", "cup"];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: "type must be one of: plate, bowl, glass, cup" },
      { status: 400 },
    );
  }

  let estimatedDimensions: Record<string, unknown> | null = null;
  let analyzedDescription: string | null = null;

  if (photoUrl) {
    try {
      // Download image and convert to base64
      let imageBuffer: Buffer;

      if (photoUrl.startsWith("/")) {
        // Local file — read from public directory
        const fs = await import("fs/promises");
        const path = await import("path");
        const filePath = path.join(process.cwd(), "public", photoUrl);
        imageBuffer = Buffer.from(await fs.readFile(filePath));
      } else {
        // Remote URL — fetch it
        const imageRes = await fetch(photoUrl);
        if (!imageRes.ok) {
          throw new Error(`Failed to fetch image: ${imageRes.status}`);
        }
        imageBuffer = Buffer.from(await imageRes.arrayBuffer());
      }

      const imageBase64 = imageBuffer.toString("base64");
      const analysis = await analyzeKitchenItem(imageBase64, type);
      estimatedDimensions = analysis.estimatedDimensions as Record<
        string,
        unknown
      >;
      analyzedDescription = analysis.description;
    } catch (error) {
      console.error("Kitchen item analysis error:", error);
      // Don't fail the request — just save without dimensions
    }
  }

  // Merge description into estimatedDimensions JSON for storage
  const dimensionsToStore =
    analyzedDescription || estimatedDimensions
      ? {
          ...(estimatedDimensions ?? {}),
          ...(analyzedDescription ? { description: analyzedDescription } : {}),
        }
      : undefined;

  const item = await prisma.kitchenItem.create({
    data: {
      familyId,
      name,
      type,
      photoUrl: photoUrl ?? null,
      estimatedDimensions: dimensionsToStore,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
