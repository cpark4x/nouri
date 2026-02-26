import { GoogleGenerativeAI } from "@google/generative-ai";

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Extract JSON from a string that may contain markdown code fences.
 */
function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return text.trim();
}

export interface ScrapedRecipe {
  title: string;
  sourceName: string;
  instructions: string;
  ingredients: { name: string; amount: string; unit: string }[];
  nutritionPerServing: Record<string, number>;
  tags: string[];
}

/**
 * Fetch a recipe URL, strip the HTML, send to Gemini for structured extraction,
 * and return a ScrapedRecipe ready to be stored in the DB.
 *
 * Throws a user-friendly Error if the fetch fails or Gemini returns
 * unparseable JSON.
 */
export async function scrapeRecipeFromUrl(url: string): Promise<ScrapedRecipe> {
  // 1. Fetch the page
  let html: string;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    html = await response.text();
  } catch {
    throw new Error("Could not extract recipe from that URL");
  }

  // 2. Strip HTML tags — remove scripts/styles first, then all remaining tags
  const plainText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);

  // 3. Call Gemini
  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Extract the recipe from this webpage text. Return JSON with:
title (string), instructions (string),
ingredients (array of {name, amount, unit}),
nutritionPerServing (object with numeric values for calories, protein, calcium,
vitaminD, iron, zinc, magnesium, potassium, vitaminA, vitaminC, fiber, omega3),
tags (array of strings like 'quick', 'high-protein', 'family-friendly').
Estimate nutrition if not explicitly stated.
Return ONLY valid JSON, no markdown, no extra text.

Webpage text:
${plainText}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) {
      throw new Error("No response from Gemini");
    }

    const json = extractJSON(responseText);

    const parsed = JSON.parse(json) as {
      title: string;
      instructions: string;
      ingredients: { name: string; amount: string; unit: string }[];
      nutritionPerServing: Record<string, number>;
      tags: string[];
    };

    // 4. Extract sourceName from URL hostname, strip www.
    const sourceName = new URL(url).hostname.replace(/^www\./, "");

    return {
      title: parsed.title,
      sourceName,
      instructions: parsed.instructions ?? "",
      ingredients: parsed.ingredients ?? [],
      nutritionPerServing: parsed.nutritionPerServing ?? {},
      tags: parsed.tags ?? [],
    };
  } catch (error) {
    // Let API-key errors propagate so misconfiguration is visible
    if (error instanceof Error && error.message.includes("API key")) {
      throw error;
    }
    throw new Error("Could not extract recipe from that URL");
  }
}
