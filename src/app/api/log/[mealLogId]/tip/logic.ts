/**
 * Pure logic for the per-meal AI growth tip endpoint.
 * Extracted for testability — no I/O, no framework imports.
 */

export interface NutrientEntry {
  nutrient: string;
  amount: number;
  unit: string;
}

export interface DailyTarget {
  nutrient: string;
  target: number;
  unit: string;
}

export interface NutrientPercent {
  amount: number;
  unit: string;
  /** null when no daily target exists for this nutrient */
  percent: number | null;
}

/**
 * For each nutrient in `nutrients`, compute how much of the daily target it
 * represents. Nutrients with no matching daily target get `percent: null`.
 * Percentages are rounded via Math.round.
 */
export function calculateNutrientPercents(
  nutrients: NutrientEntry[],
  dailyTargets: DailyTarget[],
): Record<string, NutrientPercent> {
  const targetMap: Record<string, number> = {};
  for (const dt of dailyTargets) {
    targetMap[dt.nutrient] = dt.target;
  }

  const result: Record<string, NutrientPercent> = {};
  for (const n of nutrients) {
    const target = targetMap[n.nutrient];
    result[n.nutrient] = {
      amount: n.amount,
      unit: n.unit,
      percent:
        target != null && target > 0
          ? Math.round((n.amount / target) * 100)
          : null,
    };
  }
  return result;
}

/**
 * Build the single-message user prompt for the tip AI call.
 */
export function buildTipPrompt(
  childName: string,
  age: number,
  activitySummary: string,
  mealDescription: string,
  nutrientLines: string,
): string {
  return (
    `You are Nouri. ${childName} (${age}yo, ${activitySummary}) just ate: ${mealDescription}\n` +
    `This meal provided:\n${nutrientLines}\n\n` +
    `Write ONE sentence (max 20 words) that:\n` +
    `- Names the biggest gap in this specific meal\n` +
    `- Gives ONE concrete food addition that would help\n` +
    `Be specific. Use ${childName}'s name. No intro, just the tip.`
  );
}
