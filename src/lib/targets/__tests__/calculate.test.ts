import { describe, it, expect } from 'vitest'
import { calculateTargets } from '../calculate'
import type { ChildProfile } from '../calculate'

const masonProfile: ChildProfile = {
  ageYears: 12,
  gender: 'male',
  weightKg: 45,
  heightCm: 152,
  activityLevel: 'very_high',
}

const charlotteProfile: ChildProfile = {
  ageYears: 9,
  gender: 'female',
  weightKg: 30,
  heightCm: 133,
  activityLevel: 'high',
}

describe('calculateTargets', () => {
  it('returns 12 nutrient targets', () => {
    const targets = calculateTargets(masonProfile)
    expect(targets).toHaveLength(12)
  })

  it('includes all required nutrients', () => {
    const targets = calculateTargets(masonProfile)
    const nutrients = targets.map(t => t.nutrient)
    expect(nutrients).toContain('calories')
    expect(nutrients).toContain('protein')
    expect(nutrients).toContain('calcium')
    expect(nutrients).toContain('vitaminD')
    expect(nutrients).toContain('iron')
    expect(nutrients).toContain('zinc')
    expect(nutrients).toContain('magnesium')
    expect(nutrients).toContain('potassium')
    expect(nutrients).toContain('vitaminA')
    expect(nutrients).toContain('vitaminC')
    expect(nutrients).toContain('fiber')
    expect(nutrients).toContain('omega3')
  })

  it('applies activity multiplier to calories', () => {
    const active = calculateTargets({ ...masonProfile, activityLevel: 'very_high' })
    const sedentary = calculateTargets({ ...masonProfile, activityLevel: 'low' })
    const activeCalories = active.find(t => t.nutrient === 'calories')!.amount
    const sedentaryCalories = sedentary.find(t => t.nutrient === 'calories')!.amount
    expect(activeCalories).toBeGreaterThan(sedentaryCalories)
  })

  it('scales calories in correct order: very_high > high > moderate > low', () => {
    const levels = ['low', 'moderate', 'high', 'very_high'] as const
    const caloriess = levels.map(level =>
      calculateTargets({ ...masonProfile, activityLevel: level })
        .find(t => t.nutrient === 'calories')!.amount
    )
    // Each level must be strictly greater than the previous
    for (let i = 1; i < caloriess.length; i++) {
      expect(caloriess[i]).toBeGreaterThan(caloriess[i - 1])
    }
  })

  it('sets calcium to 1300mg for a 12yo (peak bone growth)', () => {
    const targets = calculateTargets(masonProfile)
    const calcium = targets.find(t => t.nutrient === 'calcium')!
    expect(calcium.amount).toBe(1300)
    expect(calcium.unit).toBe('mg')
  })

  it('sets calcium to 1300mg for a 9yo female (peak bone growth)', () => {
    const targets = calculateTargets(charlotteProfile)
    const calcium = targets.find(t => t.nutrient === 'calcium')!
    expect(calcium.amount).toBe(1300)
    expect(calcium.unit).toBe('mg')
  })

  it('includes a source string for each target', () => {
    const targets = calculateTargets(masonProfile)
    targets.forEach(t => {
      expect(t.source).toBeTruthy()
      expect(typeof t.source).toBe('string')
    })
  })

  it('produces different calorie values for different age/gender combinations', () => {
    const masonTargets = calculateTargets(masonProfile)
    const charlotteTargets = calculateTargets(charlotteProfile)
    const masonCalories = masonTargets.find(t => t.nutrient === 'calories')!.amount
    const charlotteCalories = charlotteTargets.find(t => t.nutrient === 'calories')!.amount
    expect(masonCalories).not.toBe(charlotteCalories)
  })

  it('returns correct units for key nutrients', () => {
    const targets = calculateTargets(masonProfile)
    const calories = targets.find(t => t.nutrient === 'calories')!
    const protein = targets.find(t => t.nutrient === 'protein')!
    const vitaminD = targets.find(t => t.nutrient === 'vitaminD')!
    expect(calories.unit).toBe('kcal')
    expect(protein.unit).toBe('g')
    expect(vitaminD.unit).toBe('mcg')
  })

  it('returns higher protein for 14yo male than 9yo female', () => {
    const teen = calculateTargets({ ...masonProfile, ageYears: 14 })
    const young = calculateTargets(charlotteProfile)
    const teenProtein = teen.find(t => t.nutrient === 'protein')!.amount
    const youngProtein = young.find(t => t.nutrient === 'protein')!.amount
    expect(teenProtein).toBeGreaterThan(youngProtein)
  })
})
