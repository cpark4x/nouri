import { GoogleGenerativeAI } from "@google/generative-ai";

/** Instantiate a Gemini client, throwing if the API key is absent. */
export function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Extract JSON from a string that may contain markdown code fences.
 * Gemini occasionally wraps its output in ```json … ``` even when told not to.
 */
export function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return text.trim();
}
