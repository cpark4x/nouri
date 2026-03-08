export interface NutritionData {
  calories?: number
}

export interface NutritionTargets {
  calories: number
}

export interface PointsInput {
  meal: { nutritionData: NutritionData }
  child: { points: number; todayMealCount: number }
  dailyTargets: NutritionTargets
  hasActiveStreak: boolean // true when 7-day logging streak is active
}

export interface PointsResult {
  base: number           // always awarded
  bonusGoal: number      // bonus if calorie goal hit (within ±10%)
  streakMultiplier: number // 1.5x if 7-day streak active
  total: number          // Math.floor((base + bonusGoal) * streakMultiplier)
}

/**
 * Calculates points for a single meal save.
 * Base: 10 points per meal logged.
 * Bonus: +15 points if calories within ±10% of daily target.
 * Streak: ×1.5 if 7-day logging streak is active.
 */
export function calculatePoints(input: PointsInput): PointsResult {
  const base = 10
  const calTarget = input.dailyTargets.calories
  const calActual = input.meal.nutritionData.calories ?? 0

  // Guard against divide-by-zero when target is 0
  const withinGoal =
    calTarget > 0 && Math.abs(calActual - calTarget) / calTarget <= 0.1

  const bonusGoal = withinGoal ? 15 : 0
  const streakMultiplier = input.hasActiveStreak ? 1.5 : 1
  const total = Math.floor((base + bonusGoal) * streakMultiplier)

  return { base, bonusGoal, streakMultiplier, total }
}
