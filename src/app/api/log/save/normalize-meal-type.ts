export const ALLOWED_MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;
export type AllowedMealType = (typeof ALLOWED_MEAL_TYPES)[number];

/**
 * Normalizes a raw mealType string from the request body.
 * Returns the lowercase trimmed value if valid, or null if not allowed.
 */
export function normalizeMealType(raw: string): AllowedMealType | null {
  const normalized = (raw ?? "").toLowerCase().trim();
  if ((ALLOWED_MEAL_TYPES as readonly string[]).includes(normalized)) {
    return normalized as AllowedMealType;
  }
  return null;
}
