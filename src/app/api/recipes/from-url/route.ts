import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scrapeRecipeFromUrl } from "@/lib/ai/providers/recipe-scraper";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;

  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 400 });
  }

  // Parse and validate request body
  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Validate URL format and restrict to http/https to prevent SSRF via other protocols
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json(
        { error: "Only http and https URLs are supported" },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid URL provided" },
      { status: 400 },
    );
  }

  // Scrape and extract recipe via Gemini
  const scraped = await scrapeRecipeFromUrl(url).catch(() => null);

  if (!scraped) {
    return NextResponse.json(
      {
        error:
          "Could not extract recipe from that URL. Try describing it instead.",
      },
      { status: 422 },
    );
  }

  // Persist to DB
  try {
    const recipe = await prisma.recipe.create({
      data: {
        familyId,
        title: scraped.title,
        sourceName: scraped.sourceName,
        sourceUrl: url,
        instructions: scraped.instructions || null,
        ingredients: scraped.ingredients,
        nutritionPerServing: scraped.nutritionPerServing,
        tags: scraped.tags,
      },
      include: { childRatings: true },
    });

    return NextResponse.json({ recipe }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to save recipe" },
      { status: 500 },
    );
  }
}
