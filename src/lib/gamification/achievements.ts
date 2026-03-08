import type { PrismaClient } from '@/generated/prisma/client'

// Transaction client type: everything Prisma exposes except connection/lifecycle methods.
type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Returns the local date string (YYYY-MM-DD) for a given Date.
 * Uses UTC arithmetic so the result is stable regardless of Node timezone.
 */
function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

/**
 * Counts consecutive days ending today where the child has ≥1 meal.
 * Uses a single DB query to fetch recent meal dates, then computes in memory.
 */
async function computeStreak(childId: string, tx: Tx): Promise<number> {
  // Fetch up to 31 days of meal logs to support streak-30 badge
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 31)

  const logs = await tx.mealLog.findMany({
    where: { childId, date: { gte: cutoff } },
    select: { date: true },
  })

  const daysWithMeals = new Set(logs.map((l) => toDateKey(l.date)))

  let streak = 0
  const cursor = new Date()
  // Start from today (today's meal was just saved inside the transaction)
  for (let i = 0; i <= 31; i++) {
    const key = toDateKey(new Date(cursor))
    if (daysWithMeals.has(key)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

/**
 * Counts consecutive days ending today where the child hit their protein target.
 */
async function computeProteinGoalStreak(
  childId: string,
  proteinTarget: number,
  tx: Tx,
): Promise<number> {
  if (proteinTarget <= 0) return 0

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 10) // enough for streak-5 check

  const logs = await tx.mealLog.findMany({
    where: { childId, date: { gte: cutoff } },
    include: { nutrients: { where: { nutrient: 'protein' } } },
  })

  // Aggregate protein by day
  const proteinByDay: Record<string, number> = {}
  for (const log of logs) {
    const day = toDateKey(log.date)
    const protein = log.nutrients.reduce((sum, n) => sum + n.amount, 0)
    proteinByDay[day] = (proteinByDay[day] ?? 0) + protein
  }

  let streak = 0
  const cursor = new Date()
  for (let i = 0; i <= 10; i++) {
    const day = toDateKey(new Date(cursor))
    if ((proteinByDay[day] ?? 0) >= proteinTarget) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

/**
 * Checks which achievements a child is newly eligible for after a meal save.
 * Runs within an existing Prisma transaction.
 * Returns the keys of newly earned achievements (already-earned badges excluded).
 *
 * Wraps all logic in try/catch — on any error logs to console and returns []
 * so achievement checks never block the meal save.
 */
export async function checkAchievements(
  childId: string,
  tx: Tx,
): Promise<string[]> {
  try {
    // ── 1. Load child's family context ──────────────────────────────────────
    const child = await tx.child.findUniqueOrThrow({
      where: { id: childId },
      select: { familyId: true },
    })

    // ── 2. Already-earned badge keys ────────────────────────────────────────
    const alreadyEarned = await tx.childAchievement.findMany({
      where: { childId },
      include: { achievement: { select: { key: true } } },
    })
    const earnedKeys = new Set(alreadyEarned.map((ca) => ca.achievement.key))

    // ── 3. Total meal count ──────────────────────────────────────────────────
    const totalMeals = await tx.mealLog.count({ where: { childId } })

    // ── 4. Today's meal logs (with nutrients) ───────────────────────────────
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const todayMeals = await tx.mealLog.findMany({
      where: { childId, date: { gte: todayStart, lte: todayEnd } },
      include: { nutrients: true },
      orderBy: { date: 'asc' },
    })

    // ── 5. Streak ────────────────────────────────────────────────────────────
    const streak = await computeStreak(childId, tx)

    // ── 6. Daily targets ────────────────────────────────────────────────────
    const targets = await tx.dailyTarget.findMany({ where: { childId } })
    const calorieTarget =
      targets.find((t) => t.nutrient === 'calories')?.target ?? 0
    const proteinTarget =
      targets.find((t) => t.nutrient === 'protein')?.target ?? 0

    // ── 7. Today's aggregated nutrition ─────────────────────────────────────
    const allNutrients = todayMeals.flatMap((m) => m.nutrients)
    const todayCalories = allNutrients
      .filter((n) => n.nutrient === 'calories')
      .reduce((sum, n) => sum + n.amount, 0)

    // ── 8. Family-meal check — sibling also has a meal today ─────────────────
    const siblings = await tx.child.findMany({
      where: { familyId: child.familyId, id: { not: childId } },
      select: { id: true },
    })
    let hasFamilyMeal = false
    if (siblings.length > 0) {
      const siblingMealCount = await tx.mealLog.count({
        where: {
          childId: { in: siblings.map((s) => s.id) },
          date: { gte: todayStart, lte: todayEnd },
        },
      })
      hasFamilyMeal = siblingMealCount > 0
    }

    // ── 9. Protein goal streak ───────────────────────────────────────────────
    const proteinGoalStreak = await computeProteinGoalStreak(
      childId,
      proteinTarget,
      tx,
    )

    // ── 10. Early-bird: breakfast logged before 09:00 ────────────────────────
    const isEarlyBird = todayMeals.some(
      (m) => m.mealType === 'breakfast' && new Date(m.date).getHours() < 9,
    )

    // ── 11. Variety: 5+ distinct meal log entries today ──────────────────────
    const hasVariety = todayMeals.length >= 5

    // ── 12. Calorie goal: within ±10% of target ──────────────────────────────
    const calorieGoalHit =
      calorieTarget > 0 &&
      Math.abs(todayCalories - calorieTarget) / calorieTarget <= 0.1

    // ── 13. Evaluate all badge conditions ───────────────────────────────────
    const candidates: Array<{ key: string; condition: boolean }> = [
      { key: 'first-meal', condition: totalMeals >= 1 },
      { key: 'meals-5', condition: totalMeals >= 5 },
      { key: 'meals-25', condition: totalMeals >= 25 },
      { key: 'meals-100', condition: totalMeals >= 100 },
      { key: 'streak-3', condition: streak >= 3 },
      { key: 'streak-7', condition: streak >= 7 },
      { key: 'streak-30', condition: streak >= 30 },
      { key: 'protein-goal-5', condition: proteinGoalStreak >= 5 },
      { key: 'calories-goal-day', condition: calorieGoalHit },
      { key: 'family-meal', condition: hasFamilyMeal },
      { key: 'variety-5', condition: hasVariety },
      { key: 'early-bird', condition: isEarlyBird },
    ]

    return candidates
      .filter((c) => c.condition && !earnedKeys.has(c.key))
      .map((c) => c.key)
  } catch (err) {
    console.error('[achievements] checkAchievements error:', err)
    return []
  }
}
