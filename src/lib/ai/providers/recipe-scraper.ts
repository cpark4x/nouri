import { getClient, extractJSON } from "./gemini-client";

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
  // 1. Fetch the page — enforce a 15 s timeout so a slow server can't hang the handler
  let html: string;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    html = await response.text();
  } catch {
    throw new Error("Could not fetch that URL");
  }

  // 2. Strip HTML tags — remove scripts/styles first, then all remaining tags
  const plainText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);

  if (!plainText) {
    throw new Error("Could not extract recipe from that URL");
  }

  // 3. Call Gemini
  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Extract the recipe from this webpage text. Return JSON with:\ntitle (string), instructions (string),\ningredients (array of {name, amount, unit}),\nnutritionPerServing (object with numeric values for calories, protein, calcium,\nvitaminD, iron, zinc, magnesium, potassium, vitaminA, vitaminC, fiber, omega3),\ntags (array of strings like 'quick', 'high-protein', 'family-friendly').\nEstimate nutrition if not explicitly stated.\nReturn ONLY valid JSON, no markdown, no extra text.\n\nWebpage text:\n${plainText}`;

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
      title: parsed.title ?? "",
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
