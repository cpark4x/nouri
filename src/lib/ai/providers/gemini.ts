import { getClient, extractJSON } from "./gemini-client";

interface Recipe {
  name: string;
  description: string;
  ingredients: string[];
  estimatedPrepMinutes: number;
  nutritionHighlights: string[];
  ageAppropriate: string;
}

/**
 * Research and suggest recipes based on a query and children's nutritional context.
 * Returns an array of recipe suggestions with ingredients and nutrition highlights.
 */
export async function researchRecipes(
  query: string,
  childrenContext: object,
): Promise<Recipe[]> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are a pediatric nutrition expert and recipe researcher. Based on the query and children's context, suggest 3-5 recipes that are nutritious and age-appropriate.

Children context: ${JSON.stringify(childrenContext)}

Query: ${query}

Return ONLY valid JSON matching this exact structure (no markdown, no extra text):
[
  {
    "name": "string",
    "description": "string",
    "ingredients": ["string"],
    "estimatedPrepMinutes": number,
    "nutritionHighlights": ["string"],
    "ageAppropriate": "string"
  }
]

Focus on recipes that address common pediatric nutritional needs (calcium, iron, vitamin D, etc.) and are practical for busy parents.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error("No response from Gemini");
    }

    const json = extractJSON(text);
    return JSON.parse(json) as Recipe[];
  } catch (error) {
    if (error instanceof Error && error.message.includes("API key")) {
      throw error;
    }
    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
    throw error;
  }
}
