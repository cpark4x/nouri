import type { NutritionEstimate } from "@/lib/ai/types";

// ── Nutrient unit map (mirrors save/route.ts) ─────────────────────────────────

const NUTRIENT_UNITS: Record<keyof NutritionEstimate, string> = {
  calories: "kcal",
  protein: "g",
  calcium: "mg",
  vitaminD: "IU",
  iron: "mg",
  zinc: "mg",
  magnesium: "mg",
  potassium: "mg",
  vitaminA: "mcg",
  vitaminC: "mg",
  fiber: "g",
  omega3: "mg",
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Validate that a description is a non-empty string.
 * Returns an error message if invalid, null if valid.
 */
export function validateDescription(description: unknown): string | null {
  if (typeof description !== "string") {
    return "description must be a string";
  }
  if (description.trim().length === 0) {
    return "description must not be empty";
  }
  return null;
}

/**
 * Convert a ParsedMeal's totalNutrition object into the array of
 * { nutrient, amount, unit } records used for Prisma NutritionEntry creation.
 * Zero-value nutrients are filtered out.
 */
export function buildNutritionEntries(
  totalNutrition: NutritionEstimate,
): { nutrient: string; amount: number; unit: string }[] {
  return (Object.keys(NUTRIENT_UNITS) as Array<keyof NutritionEstimate>)
    .filter((key) => totalNutrition[key] > 0)
    .map((key) => ({
      nutrient: key,
      amount: totalNutrition[key],
      unit: NUTRIENT_UNITS[key],
    }));
}
