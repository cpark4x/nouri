# Spec: B5 — Nutrition Target Transparency

**Priority:** HIGH — trust/confidence in the core data  
**Phase:** 1  
**Depends on:** None (standalone enhancement to child profile + edit flow)

---

## Goal

Parents need to understand where their children's daily nutrient targets come from and what changes them. Currently targets are set once at seed time and never explained. This spec:

1. Extracts target calculation into a testable `calculate.ts` library
2. Shows each target's source/formula on the child detail page
3. Automatically recalculates targets when profile changes (height, weight, activity)

---

## Files Changed (≤5)

| File | Action | What changes |
|---|---|---|
| `src/lib/targets/calculate.ts` | New | Pure function: `calculateTargets(profile)` → target map |
| `src/lib/targets/__tests__/calculate.test.ts` | New | Unit tests for target calculation |
| `src/app/api/child/[id]/update/route.ts` | Modify | After profile save, recalculate and upsert DailyTarget rows |
| `src/components/profile/profile-form.tsx` | Modify | Show "Targets will recalculate on save" notice when height/weight/activity changes |
| `src/app/(app)/child/[id]/page.tsx` | Modify | Add "How targets are set" expandable section to Today tab |

---

## Implementation

### 1. calculate.ts (new)

```typescript
// src/lib/targets/calculate.ts

export interface ChildProfile {
  ageYears: number        // calculated from dateOfBirth
  gender: 'male' | 'female'
  weightKg: number
  heightCm: number
  activityLevel: 'low' | 'moderate' | 'high' | 'very_high'  // from activityProfile JSON
}

export interface NutrientTarget {
  nutrient: string
  amount: number
  unit: string
  source: string    // e.g. "USDA DRI for 12yo active males, +15% for high-intensity sport"
}

/**
 * Calculate evidence-based daily nutrient targets for a child.
 * Based on USDA DRI (Dietary Reference Intakes) age/gender tables,
 * with activity multipliers for calorie and protein targets.
 */
export function calculateTargets(profile: ChildProfile): NutrientTarget[]
```

**Nutrient coverage** (same 12 nutrients already in DailyTarget):
calories, protein, calcium, vitaminD, iron, zinc, magnesium, potassium, vitaminA, vitaminC, fiber, omega3

**Activity multipliers for calories:**
- low: 1.3 (sedentary)
- moderate: 1.5 (light activity)
- high: 1.7 (active 3-5x/week)
- very_high: 2.0 (athlete, 5+ intense sessions/week)

**Source strings** (shown in UI): "USDA DRI [age]yo [gender], [activity] multiplier"

### 2. Update route (modify)

In `PUT /api/child/[id]/update/route.ts`, after saving the profile, call `calculateTargets()` and upsert `DailyTarget` rows:

```typescript
const newTargets = calculateTargets(buildProfile(updatedChild))

await Promise.all(
  newTargets.map(t =>
    prisma.dailyTarget.upsert({
      where: { childId_nutrient: { childId: child.id, nutrient: t.nutrient } },
      update: { target: t.amount, unit: t.unit },
      create: { childId: child.id, nutrient: t.nutrient, target: t.amount, unit: t.unit }
    })
  )
)
```

### 3. "How targets are set" (page.tsx)

Add a simple collapsible section to the Today tab (below the nutrient bars):

```
▾ How targets are set
  Calories: 2,250 kcal/day — USDA DRI 12yo male, very-high-activity multiplier
  Protein: 62g/day — USDA DRI 12yo male, +25% for muscle growth + sport
  Calcium: 1,300mg/day — USDA DRI 12-18yo (peak bone growth)
  ...
```

Fetch this from the existing `GET /api/child/[id]` endpoint which already returns `dailyTargets`. No new API route needed.

---

## Test Skeleton

```typescript
// src/lib/targets/__tests__/calculate.test.ts
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
  })

  it('applies activity multiplier to calories', () => {
    const active = calculateTargets({ ...masonProfile, activityLevel: 'very_high' })
    const sedentary = calculateTargets({ ...masonProfile, activityLevel: 'low' })
    const activeCalories = active.find(t => t.nutrient === 'calories')!.amount
    const sedentaryCalories = sedentary.find(t => t.nutrient === 'calories')!.amount
    expect(activeCalories).toBeGreaterThan(sedentaryCalories)
  })

  it('sets calcium to 1300mg for a 12yo (peak bone growth)', () => {
    const targets = calculateTargets(masonProfile)
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

  it('produces different values for different age/gender combinations', () => {
    const masonTargets = calculateTargets(masonProfile)
    const charlotteTargets = calculateTargets(charlotteProfile)
    const masonCalories = masonTargets.find(t => t.nutrient === 'calories')!.amount
    const charlotteCalories = charlotteTargets.find(t => t.nutrient === 'calories')!.amount
    expect(masonCalories).not.toBe(charlotteCalories)
  })
})
```

---

## Acceptance Criteria

- [ ] `calculateTargets()` produces all 12 nutrients for any child profile
- [ ] Activity multiplier correctly scales calories (very_high > high > moderate > low)
- [ ] Saving an updated child profile (height, weight, activity) upserts DailyTarget rows
- [ ] Child detail page shows "How targets are set" with source explanations
- [ ] Profile form shows "Targets will recalculate on save" when relevant fields change
- [ ] `npm test` passes (new tests included)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
