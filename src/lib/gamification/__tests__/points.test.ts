import { describe, it, expect } from 'vitest'
import { calculatePoints } from '../points'

const base = {
  meal: { nutritionData: { calories: 500 } },
  child: { points: 0, todayMealCount: 1 },
  dailyTargets: { calories: 2000 },
  hasActiveStreak: false,
}

describe('calculatePoints', () => {
  it('awards base 10 points for any meal', () => {
    const result = calculatePoints(base)
    expect(result.total).toBe(10)
    expect(result.base).toBe(10)
    expect(result.bonusGoal).toBe(0)
    expect(result.streakMultiplier).toBe(1)
  })

  it('awards bonus 15 points when calories within ±10% of target', () => {
    const result = calculatePoints({
      ...base,
      meal: { nutritionData: { calories: 2000 } },
    })
    expect(result.bonusGoal).toBe(15)
    expect(result.total).toBe(25)
  })

  it('awards bonus when calories are exactly at lower 10% boundary', () => {
    // 2000 * 0.9 = 1800 — exactly 10% below target
    const result = calculatePoints({
      ...base,
      meal: { nutritionData: { calories: 1800 } },
    })
    expect(result.bonusGoal).toBe(15)
    expect(result.total).toBe(25)
  })

  it('does NOT award bonus when calories are outside ±10%', () => {
    // 2000 * 0.89 = 1780 — just outside 10%
    const result = calculatePoints({
      ...base,
      meal: { nutritionData: { calories: 1780 } },
    })
    expect(result.bonusGoal).toBe(0)
    expect(result.total).toBe(10)
  })

  it('applies 1.5x streak multiplier when streak active', () => {
    const result = calculatePoints({ ...base, hasActiveStreak: true })
    expect(result.streakMultiplier).toBe(1.5)
    expect(result.total).toBe(15) // floor(10 * 1.5)
  })

  it('applies streak multiplier to base + bonus', () => {
    const result = calculatePoints({
      ...base,
      meal: { nutritionData: { calories: 2000 } },
      hasActiveStreak: true,
    })
    expect(result.total).toBe(37) // floor(25 * 1.5)
  })

  it('handles missing calories (undefined) gracefully', () => {
    const result = calculatePoints({
      ...base,
      meal: { nutritionData: {} },
    })
    // calories = 0, not within 10% of 2000
    expect(result.bonusGoal).toBe(0)
    expect(result.total).toBe(10)
  })

  it('does not award bonus when calorie target is 0 (guard divide-by-zero)', () => {
    const result = calculatePoints({
      ...base,
      dailyTargets: { calories: 0 },
      meal: { nutritionData: { calories: 0 } },
    })
    expect(result.bonusGoal).toBe(0)
    expect(result.total).toBe(10)
  })
})
