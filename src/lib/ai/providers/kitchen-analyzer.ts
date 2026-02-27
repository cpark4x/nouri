import OpenAI from "openai";

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

export interface KitchenItemDimensions {
  diameterCm?: number;
  volumeMl?: number;
  heightCm?: number;
  description: string;
}

/**
 * Analyze a kitchen item photo using GPT-4o vision to estimate dimensions
 * for use in food portion estimation.
 *
 * Throws on API or parse errors — callers are responsible for graceful degradation.
 */
export async function analyzeKitchenItem(
  imageBase64: string,
  type: string,
  mimeType = "image/jpeg",
): Promise<{
  estimatedDimensions: { diameterCm?: number; volumeMl?: number; heightCm?: number };
  description: string;
}> {
  const client = getClient();

  const prompt = `This is a kitchen ${type} (plate/bowl/glass/cup). 
Estimate its dimensions for use in food portion estimation.
Return JSON only: { diameterCm?: number, volumeMl?: number, heightCm?: number, description: string }
description should be like: 'White ceramic dinner plate, approximately 26cm diameter'
Only include the dimensions that make sense for this item type.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
            },
          },
          {
            type: "text",
            text: prompt,
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
  const parsed = JSON.parse(json) as KitchenItemDimensions;
  const { description, ...dims } = parsed;
  return {
    estimatedDimensions: dims,
    description: description ?? "",
  };
}
