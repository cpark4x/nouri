/**
 * Pure logic for daily goal gap suggestions.
 * Separated for testability — no I/O, no DB, no AI calls.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NutrientTarget {
  nutrient: string;
  target: number;
  unit: string;
}

export interface MealLogWithNutrients {
  nutrients: { nutrient: string; amount: number; unit: string }[];
}

export interface NutrientGap {
  nutrient: string;
  target: number;
  unit: string;
  intake: number;
  remaining: number;
  percentRemaining: number;
}

// ─── aggregateTodayIntake ────────────────────────────────────────────────────

/**
 * Sums all nutrient amounts across today's meal logs into a flat map.
 */
export function aggregateTodayIntake(
  mealLogs: MealLogWithNutrients[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const meal of mealLogs) {
    for (const n of meal.nutrients) {
      map[n.nutrient] = (map[n.nutrient] ?? 0) + n.amount;
    }
  }
  return map;
}

// ─── computeGaps ─────────────────────────────────────────────────────────────

/**
 * Computes nutrient gaps sorted by percentRemaining descending.
 * Excludes nutrients with a target of 0 or where the child has already
 * met or exceeded their target (remaining <= 0).
 */
export function computeGaps(
  targets: NutrientTarget[],
  intakeMap: Record<string, number>,
): NutrientGap[] {
  return targets
    .filter((t) => t.target > 0)
    .map((t) => {
      const intake = intakeMap[t.nutrient] ?? 0;
      const remaining = t.target - intake;
      const percentRemaining = remaining / t.target;
      return {
        nutrient: t.nutrient,
        target: t.target,
        unit: t.unit,
        intake,
        remaining,
        percentRemaining,
      };
    })
    .filter((g) => g.remaining > 0)
    .sort((a, b) => b.percentRemaining - a.percentRemaining);
}

// ─── isOnTrack ────────────────────────────────────────────────────────────────

/**
 * Returns true if the child is "on track" (< 30% of calorie target remaining),
 * meaning no suggestion is needed. Also returns true when target is 0.
 */
export function isOnTrack(calorieTarget: number, calorieIntake: number): boolean {
  if (calorieTarget <= 0) return true;
  const percentRemaining = (calorieTarget - calorieIntake) / calorieTarget;
  return percentRemaining < 0.3;
}

// ─── buildSuggestionPrompt ───────────────────────────────────────────────────

/**
 * Builds the prompt for Anthropic asking for a one-sentence food suggestion.
 */
export function buildSuggestionPrompt(
  childName: string,
  age: number,
  gaps: NutrientGap[],
  calorieIntake: number,
  calorieTarget: number,
): string {
  const [gap1, gap2] = gaps;
  const gapLines = [gap1, gap2]
    .filter(Boolean)
    .map((g) => `${g.nutrient}: ${g.remaining}${g.unit} remaining`)
    .join(", ");

  return (
    `${childName} (${age}yo) needs to eat more today. ` +
    `Their biggest gaps: ${gapLines}. ` +
    `They've eaten ${calorieIntake} of ${calorieTarget} calories today. ` +
    `Write ONE sentence (max 25 words) with a specific kid-friendly food suggestion ` +
    `that addresses both gaps if possible. Use their name. No intro.`
  );
}
