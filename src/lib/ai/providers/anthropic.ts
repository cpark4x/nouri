import Anthropic from "@anthropic-ai/sdk";
import type { ParsedMeal, ChatMessage, ChatResponse } from "../types";

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }
  return new Anthropic();
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
 * Parse a natural-language food description into structured food items
 * with USDA-aligned nutrition estimates.
 */
export async function parseFoodDescription(
  description: string,
  childContext: object,
): Promise<ParsedMeal> {
  const client = getClient();

  const systemPrompt = `You are a pediatric nutrition expert. Given a description of food a child ate, extract each food item and estimate nutrition using USDA-aligned values.

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
  "assumptions": ["string"],
  "title": "string",
  "cleanDescription": "string"
}

Units: protein/fiber in grams, calcium/iron/zinc/magnesium/potassium/omega3 in mg, vitaminD in IU, vitaminA in mcg, vitaminC in mg, calories in kcal.
Be conservative with estimates. If unsure about a specific food variety, note the assumption.
title: 2-5 words, title case, clean and descriptive (e.g. "Scrambled Eggs & Toast", "Chicken Pasta Dinner")
cleanDescription: One complete sentence in third person describing the full meal (e.g. "Two scrambled eggs with buttered whole wheat toast and a glass of orange juice.")`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: description }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Anthropic");
    }

    const json = extractJSON(textBlock.text);
    const parsed = JSON.parse(json) as ParsedMeal;
    // Fallback for old data that pre-dates these fields
    parsed.title = parsed.title ?? "";
    parsed.cleanDescription = parsed.cleanDescription ?? "";
    return parsed;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Chat with the Nouri assistant. Returns a response with optional
 * structured actions (e.g., update_profile, save_recipe, log_meal).
 */
export async function chat(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<ChatResponse> {
  const client = getClient();

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Anthropic");
    }

    const text = textBlock.text;

    // Check if the response contains a JSON actions block at the end
    const actionsMatch = text.match(
      /---ACTIONS---\s*\n?([\s\S]*?)(?:\n?---END_ACTIONS---|$)/,
    );

    if (actionsMatch) {
      const content = text.slice(0, text.indexOf("---ACTIONS---")).trim();
      try {
        const actions = JSON.parse(extractJSON(actionsMatch[1]));
        return { content, actions };
      } catch {
        // If action parsing fails, return the full text as content
        return { content: text };
      }
    }

    return { content: text };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
    throw error;
  }
}
