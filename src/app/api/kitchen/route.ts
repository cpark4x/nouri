import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { analyzeKitchenItem } from "@/lib/ai/providers/kitchen-analyzer";

/**
 * Detect image MIME type from buffer magic bytes.
 * Falls back to image/jpeg, which is the most common upload format.
 */
function detectMimeType(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  )
    return "image/png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46)
    return "image/gif";
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  return "image/jpeg";
}

/**
 * Reject URLs that point to private/internal network addresses to prevent SSRF.
 */
function isPrivateUrl(urlString: string): boolean {
  try {
    const { protocol, hostname } = new URL(urlString);
    if (protocol !== "https:") return true;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "169.254.169.254" || // AWS/GCP metadata
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    )
      return true;
    return false;
  } catch {
    return true;
  }
}

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
        const publicDir = path.resolve(process.cwd(), "public");
        // Strip the leading slash so path.resolve treats it as relative,
        // preventing path traversal via encoded ".." segments.
        const relativePath = photoUrl.slice(1);
        const filePath = path.resolve(publicDir, relativePath);
        if (!filePath.startsWith(publicDir + path.sep)) {
          throw new Error("Invalid image path");
        }
        imageBuffer = Buffer.from(await fs.readFile(filePath));
      } else {
        // Remote URL (e.g. Azure Blob Storage) — validate before fetching
        if (isPrivateUrl(photoUrl)) {
          throw new Error("Remote image URL not allowed");
        }
        const imageRes = await fetch(photoUrl);
        if (!imageRes.ok) {
          throw new Error(`Failed to fetch image: ${imageRes.status}`);
        }
        imageBuffer = Buffer.from(await imageRes.arrayBuffer());
      }

      const mimeType = detectMimeType(imageBuffer);
      const imageBase64 = imageBuffer.toString("base64");
      const analysis = await analyzeKitchenItem(imageBase64, type, mimeType);
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
