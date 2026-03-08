# Spec: C6 — Gamification (Points, Badges, Milestone Goals)

**Priority:** HIGH — the primary reason kids will open the app voluntarily
**Phase:** 2
**Depends on:** C1 or C2 (real user accounts must exist for child records to be meaningful)

---

## Goal

Layer points, achievement badges, and parent-set milestone goals onto the existing meal logging flow. Everything runs synchronously inside the meal-save transaction — no background jobs. After saving, the API returns any newly earned badges and milestones so the client can fire a celebration animation.

---

## Schema Changes

```prisma
// Add to Child model:
model Child {
  // ... existing fields ...
  points        Int              @default(0)
  achievements  ChildAchievement[]
  milestoneGoals MilestoneGoal[]
}

// New models:
model Achievement {
  id          String             @id @default(cuid())
  key         String             @unique  // slug, e.g. "first-meal", "streak-7"
  name        String             // display name, e.g. "First Bite"
  description String             // e.g. "Log your first meal"
  iconRef     String             // icon slug or emoji, e.g. "🥗" or "star-green"
  createdAt   DateTime           @default(now())
  children    ChildAchievement[]
}

model ChildAchievement {
  id            String      @id @default(cuid())
  childId       String
  achievementId String
  earnedAt      DateTime    @default(now())
  child         Child       @relation(fields: [childId], references: [id])
  achievement   Achievement @relation(fields: [achievementId], references: [id])

  @@unique([childId, achievementId])  // each badge earned at most once per child
}

model MilestoneGoal {
  id                String    @id @default(cuid())
  childId           String
  createdByParentId String
  description       String    // e.g. "Log 20 meals"
  targetCount       Int
  currentCount      Int       @default(0)
  completedAt       DateTime? // null until target reached
  createdAt         DateTime  @default(now())
  child             Child     @relation(fields: [childId], references: [id])
  createdBy         User      @relation(fields: [createdByParentId], references: [id])
}
```

Add to `User` model:
```prisma
model User {
  // ... existing fields ...
  createdMilestoneGoals MilestoneGoal[]
}
```

Run after schema change:
```bash
npx prisma migrate dev --name add_gamification
npx prisma generate
```

---

## Achievement Badge Set (seed data)

Seed these 12 badge types into the `Achievement` table. The `key` is the stable identifier used in code.

| key | name | description | iconRef | Trigger condition |
|-----|------|-------------|---------|-------------------|
| `first-meal` | First Bite | Log your first meal | 🥗 | mealCount === 1 |
| `meals-5` | Five and Counting | Log 5 meals | ⭐ | mealCount === 5 |
| `meals-25` | On a Roll | Log 25 meals | 🎯 | mealCount === 25 |
| `meals-100` | Century | Log 100 meals | 🏆 | mealCount === 100 |
| `streak-3` | 3-Day Streak | Log meals 3 days in a row | 🔥 | streak === 3 |
| `streak-7` | Week Warrior | Log meals 7 days in a row | 🔥🔥 | streak === 7 |
| `streak-30` | Habit Locked | Log meals 30 days in a row | 💪 | streak === 30 |
| `protein-goal-5` | Protein Pro | Hit your protein goal 5 days in a row | 💪 | proteinGoalStreak === 5 |
| `calories-goal-day` | Balanced Day | Hit your calorie goal today | ✅ | caloriesToday within ±10% of target |
| `family-meal` | Family Table | Both kids logged a meal on the same day | 🍽️ | sibling also has a meal today |
| `variety-5` | Foodie | Log 5 different food types in a single day | 🌈 | distinctFoodTypes >= 5 |
| `early-bird` | Early Bird | Log breakfast before 9am | 🌅 | meal logged with mealTime < 09:00 |

---

## Files Changed (≤10)

| File | Action | What changes |
|------|--------|--------------|
| `prisma/schema.prisma` | Modify | Add `points`, `Achievement`, `ChildAchievement`, `MilestoneGoal` models |
| `prisma/seed.ts` | Modify | Seed 12 `Achievement` rows |
| `src/lib/gamification/points.ts` | New | Pure: `calculatePoints(meal, child)` — returns points delta |
| `src/lib/gamification/achievements.ts` | New | Pure: `checkAchievements(childId, tx)` — returns newly earned badge keys |
| `src/lib/gamification/__tests__/points.test.ts` | New | Unit tests for points calculation |
| `src/lib/gamification/__tests__/achievements.test.ts` | New | Unit tests for achievement checks |
| `src/app/api/log/save/route.ts` | Modify | Run gamification inside meal-save transaction |
| `src/components/gamification/celebration.tsx` | New | Celebration overlay (confetti + badge display) |
| `src/components/gamification/milestone-form.tsx` | New | Parent UI for creating milestone goals |
| `src/app/(app)/kids/[id]/page.tsx` | Modify | Show earned badges + active milestone goals |

---

## Implementation

### 1. points.ts — points calculation

```typescript
// src/lib/gamification/points.ts

export interface PointsInput {
  meal: { nutritionData: NutritionData }
  child: { points: number; todayMealCount: number }
  dailyTargets: NutritionTargets
  hasActiveStreak: boolean // 7-day streak active
}

export interface PointsResult {
  base: number       // always awarded
  bonusGoal: number  // bonus if calorie goal hit (within ±10%)
  streakMultiplier: number // 1.5x if 7-day streak active
  total: number      // Math.floor((base + bonusGoal) * streakMultiplier)
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
  const withinGoal = Math.abs(calActual - calTarget) / calTarget <= 0.10
  const bonusGoal = withinGoal ? 15 : 0
  const streakMultiplier = input.hasActiveStreak ? 1.5 : 1
  const total = Math.floor((base + bonusGoal) * streakMultiplier)
  return { base, bonusGoal, streakMultiplier, total }
}
```

### 2. achievements.ts — eligibility checks

```typescript
// src/lib/gamification/achievements.ts

/**
 * Checks which achievements a child is newly eligible for after a meal save.
 * Runs within an existing Prisma transaction.
 * Returns keys of newly earned achievements (already-earned ones are excluded).
 */
export async function checkAchievements(
  childId: string,
  tx: PrismaTransactionClient
): Promise<string[]>
```

Implementation approach:
1. Load child's current stats from `tx`: total meal count, streak, today's nutrition vs targets
2. Load already-earned achievement keys for this child from `ChildAchievement`
3. For each badge in the badge set: evaluate trigger condition → if met AND not already earned → add to `newlyEarned`
4. Return `newlyEarned` keys

**Error handling:** Wrap the entire function body in try/catch. On any error, log to console and return `[]` — achievement checks should never block the meal save.

### 3. Meal save transaction — add gamification

```typescript
// src/app/api/log/save/route.ts — inside the existing save handler

const result = await prisma.$transaction(async (tx) => {
  // 1. Existing: save MealLog
  const meal = await tx.mealLog.create({ data: { ... } })

  // 2. Gamification (wrapped in try/catch — must not block meal save)
  let pointsDelta = 0
  let newBadgeKeys: string[] = []
  let completedMilestones: string[] = []

  try {
    const child = await tx.child.findUniqueOrThrow({ where: { id: childId } })
    const targets = await getDailyTargets(childId)
    const hasStreak = await checkStreakActive(childId, tx)  // consecutive days ≥1 meal

    // Points
    const points = calculatePoints({ meal, child, dailyTargets: targets, hasActiveStreak: hasStreak })
    pointsDelta = points.total
    await tx.child.update({
      where: { id: childId },
      data: { points: { increment: pointsDelta } }
    })

    // Achievements
    newBadgeKeys = await checkAchievements(childId, tx)
    if (newBadgeKeys.length > 0) {
      const achievements = await tx.achievement.findMany({
        where: { key: { in: newBadgeKeys } }
      })
      await tx.childAchievement.createMany({
        data: achievements.map(a => ({ childId, achievementId: a.id }))
      })
    }

    // Milestone goals
    const activeGoals = await tx.milestoneGoal.findMany({
      where: { childId, completedAt: null }
    })
    for (const goal of activeGoals) {
      const newCount = goal.currentCount + 1
      const completed = newCount >= goal.targetCount
      await tx.milestoneGoal.update({
        where: { id: goal.id },
        data: {
          currentCount: newCount,
          completedAt: completed ? new Date() : null
        }
      })
      if (completed) completedMilestones.push(goal.description)
    }
  } catch (err) {
    console.error('[gamification] error during meal save:', err)
    // Do not rethrow — meal save succeeds regardless
  }

  return { meal, pointsDelta, newBadgeKeys, completedMilestones }
})

// Return gamification data to client
return Response.json({
  success: true,
  mealId: result.meal.id,
  gamification: {
    pointsEarned: result.pointsDelta,
    newBadges: result.newBadgeKeys,
    completedMilestones: result.completedMilestones,
  }
})
```

### 4. Celebration component

```typescript
// src/components/gamification/celebration.tsx
'use client'

interface CelebrationProps {
  badges: string[]        // badge keys just earned
  milestones: string[]    // milestone descriptions just completed
  pointsEarned: number
  onDismiss: () => void
}

export function CelebrationOverlay({ badges, milestones, pointsEarned, onDismiss }: CelebrationProps)
```

Fires when `badges.length > 0 || milestones.length > 0`. Shows earned badge icons + names, milestone completion message, points earned. Dismisses on tap or after 4 seconds.

### 5. Milestone goal form — parent UI

```typescript
// src/components/gamification/milestone-form.tsx
// Form: description (text), targetCount (number)
// POST /api/kids/[childId]/milestones
// Only shown to authenticated parents (not in kid-only view)
```

Add a new API route:
```
POST /api/kids/[childId]/milestones
Body: { description: string, targetCount: number }
Returns: { id: string }
```

### 6. Child detail page — badges + milestones section

On `src/app/(app)/kids/[id]/page.tsx`, add below the existing nutrition content:

```
Achievements
────────────
🥗 First Bite    ⭐ Five and Counting    🔥 3-Day Streak
(earned badges shown as colored tiles; unearned shown greyed out)

Goals
─────
Log 20 meals  ████████░░  14/20
              [Set by Mom · 70% complete]
```

---

## Test Skeleton

```typescript
// src/lib/gamification/__tests__/points.test.ts
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
  })

  it('awards bonus 15 points when calories within ±10% of target', () => {
    const result = calculatePoints({
      ...base,
      meal: { nutritionData: { calories: 2000 } },
    })
    expect(result.total).toBe(25)
  })

  it('applies 1.5x streak multiplier when streak active', () => {
    const result = calculatePoints({ ...base, hasActiveStreak: true })
    expect(result.total).toBe(15)  // floor(10 * 1.5)
  })

  it('applies streak multiplier to base + bonus', () => {
    const result = calculatePoints({
      ...base,
      meal: { nutritionData: { calories: 2000 } },
      hasActiveStreak: true,
    })
    expect(result.total).toBe(37)  // floor(25 * 1.5)
  })
})
```

```typescript
// src/lib/gamification/__tests__/achievements.test.ts
// Integration tests — require database connection (use test DB)
import { describe, it, expect } from 'vitest'
import { checkAchievements } from '../achievements'

describe('checkAchievements', () => {
  it('returns first-meal badge on first meal logged', async () => {
    // Setup: child with 1 total meal, no prior achievements
    const earned = await checkAchievements(testChildId, tx)
    expect(earned).toContain('first-meal')
  })

  it('does not return already-earned badge', async () => {
    // Setup: child already has first-meal badge
    const earned = await checkAchievements(testChildId, tx)
    expect(earned).not.toContain('first-meal')
  })

  it('returns empty array and does not throw on error', async () => {
    // Setup: pass invalid childId — should catch internally and return []
    const earned = await checkAchievements('nonexistent-id', tx)
    expect(earned).toEqual([])
  })
})
```

---

## Acceptance Criteria

- [ ] `Achievement` table seeded with 12 badge types on `npx prisma db seed`
- [ ] Logging a meal awards points (visible on kid card after refresh)
- [ ] First meal logged earns the "First Bite" badge + celebration animation fires
- [ ] 7-day streak earns "Week Warrior" badge
- [ ] Calorie goal hit (±10%) awards bonus 15 points
- [ ] 7-day active streak applies 1.5× multiplier
- [ ] Parent can create a milestone goal for a child from the child detail page
- [ ] Milestone progress increments with each meal logged
- [ ] Milestone completion fires celebration animation
- [ ] Badge earned only once per child (no duplicates in `ChildAchievement`)
- [ ] Gamification failure does NOT prevent meal from saving (try/catch verified)
- [ ] `npm test` passes (new tests included)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
