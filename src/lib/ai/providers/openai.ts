import OpenAI from "openai";
import type { ParsedMeal } from "../types";

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  return new OpenAI();
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

/**
 * Analyze a food photo using GPT-4o vision to identify foods,
 * estimate portions, and provide USDA-aligned nutrition data.
 */
export async function analyzeFoodPhoto(
  imageBase64: string,
  childContext: object,
): Promise<ParsedMeal> {
  const client = getClient();

  const systemPrompt = `You are a pediatric nutrition expert analyzing a photo of food a child ate. Identify each food item, estimate portions, and provide USDA-aligned nutrition values.

Child context: ${JSON.stringify(childContext)}

Return ONLY valid JSON matching this exact structure (no markdown, no extra text):
{
  "items": [
    { "name": "string", "quantity": "string", "estimatedGrams": number }
  ],
  "totalNutrition": {
    "calories": number,
    "protein": number,
    "calcium": number,
    "vitaminD": number,
    "iron": number,
    "zinc": number,
    "magnesium": number,
    "potassium": number,
    "vitaminA": number,
    "vitaminC": number,
    "fiber": number,
    "omega3": number
  },
  "confidence": "high" | "medium" | "low",
  "assumptions": ["string"]
}

Units: protein/fiber in grams, calcium/iron/zinc/magnesium/potassium/omega3 in mg, vitaminD in IU, vitaminA in mcg, vitaminC in mg, calories in kcal.
Be conservative with estimates. Note assumptions about portion sizes based on visual cues.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
            {
              type: "text",
              text: "Analyze this food photo and provide nutrition estimates.",
            },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("No response from OpenAI");
    }

    const json = extractJSON(text);
    return JSON.parse(json) as ParsedMeal;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }
}
