export type MealType = "breakfast" | "lunch" | "snack" | "dinner";

/**
 * Infer meal type from time of day:
 * Before 10am → breakfast, 10am–2pm → lunch, 2pm–5pm → snack, 5pm+ → dinner
 */
export function inferMealType(now: Date = new Date()): MealType {
  const hour = now.getHours();
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snack";
  return "dinner";
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};
