import { describe, it, expect, vi } from 'vitest'
import { checkAchievements } from '../achievements'

// ---------------------------------------------------------------------------
// Helpers: build a minimal mock Prisma transaction client
// ---------------------------------------------------------------------------

function makeTx({
  familyId = 'fam-1',
  earnedKeys = [] as string[],
  totalMeals = 0,
  todayMeals = [] as object[],
  streakMeals = [] as { date: Date }[],
  siblings = [] as { id: string }[],
  targets = [] as { nutrient: string; target: number }[],
}: {
  familyId?: string
  earnedKeys?: string[]
  totalMeals?: number
  todayMeals?: object[]
  streakMeals?: { date: Date }[]
  siblings?: { id: string }[]
  targets?: { nutrient: string; target: number }[]
}) {
  // mealLog.findMany is called for: today's meals, streak window, protein window
  // We distinguish by whether `include` has `nutrients` or just `select: { date }`
  const mealLogFindMany = vi.fn().mockImplementation(
    (args: { select?: unknown; include?: unknown }) => {
      if (args?.select && (args.select as Record<string, unknown>)['date']) {
        // streak or protein window query (select: { date: true })
        return Promise.resolve(streakMeals)
      }
      // today's meals query (include: { nutrients: true })
      return Promise.resolve(todayMeals)
    },
  )

  return {
    child: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ familyId }),
      findMany: vi.fn().mockResolvedValue(siblings),
    },
    childAchievement: {
      findMany: vi
        .fn()
        .mockResolvedValue(
          earnedKeys.map((key) => ({ achievement: { key } })),
        ),
    },
    mealLog: {
      count: vi.fn().mockResolvedValue(totalMeals),
      findMany: mealLogFindMany,
    },
    dailyTarget: {
      findMany: vi.fn().mockResolvedValue(targets),
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkAchievements', () => {
  it('returns first-meal badge when child has 1 total meal and no prior badges', async () => {
    const tx = makeTx({ totalMeals: 1 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earned = await checkAchievements('child-1', tx as any)
    expect(earned).toContain('first-meal')
  })

  it('does not return first-meal badge when it is already earned', async () => {
    const tx = makeTx({ totalMeals: 5, earnedKeys: ['first-meal'] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earned = await checkAchievements('child-1', tx as any)
    expect(earned).not.toContain('first-meal')
  })

  it('returns meals-5 badge when totalMeals === 5 and not yet earned', async () => {
    const tx = makeTx({ totalMeals: 5, earnedKeys: ['first-meal'] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earned = await checkAchievements('child-1', tx as any)
    expect(earned).toContain('meals-5')
  })

  it('returns streak-3 badge when child has 3 consecutive days with meals', async () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const twoDaysAgo = new Date(today)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const tx = makeTx({
      totalMeals: 3,
      streakMeals: [{ date: today }, { date: yesterday }, { date: twoDaysAgo }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earned = await checkAchievements('child-1', tx as any)
    expect(earned).toContain('streak-3')
  })

  it('returns calories-goal-day badge when today calories within ±10% of target', async () => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const tx = makeTx({
      totalMeals: 1,
      targets: [{ nutrient: 'calories', target: 2000 }],
      todayMeals: [
        {
          date: todayStart,
          mealType: 'breakfast',
          nutrients: [{ nutrient: 'calories', amount: 2000 }],
        },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earned = await checkAchievements('child-1', tx as any)
    expect(earned).toContain('calories-goal-day')
  })

  it('returns family-meal badge when a sibling also logged a meal today', async () => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Need sibling meal count > 0: override mealLog.count to handle both calls
    const tx = makeTx({
      totalMeals: 1,
      siblings: [{ id: 'sibling-1' }],
    })
    // Override count: first call = totalMeals (1), second call = sibling meal count (1)
    const countMock = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1)
    tx.mealLog.count = countMock

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earned = await checkAchievements('child-1', tx as any)
    expect(earned).toContain('family-meal')
  })

  it('returns early-bird badge when breakfast logged before 09:00', async () => {
    const earlyBreakfast = new Date()
    earlyBreakfast.setHours(7, 30, 0, 0)

    const tx = makeTx({
      totalMeals: 1,
      todayMeals: [
        {
          date: earlyBreakfast,
          mealType: 'breakfast',
          nutrients: [],
        },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earned = await checkAchievements('child-1', tx as any)
    expect(earned).toContain('early-bird')
  })

  it('returns variety-5 badge when 5+ distinct meals are logged today', async () => {
    const todayStart = new Date()
    todayStart.setHours(8, 0, 0, 0)

    const fiveMeals = Array.from({ length: 5 }, (_, i) => ({
      date: new Date(todayStart.getTime() + i * 3600_000),
      mealType: 'snack',
      nutrients: [],
    }))

    const tx = makeTx({ totalMeals: 5, todayMeals: fiveMeals })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earned = await checkAchievements('child-1', tx as any)
    expect(earned).toContain('variety-5')
  })

  it('returns empty array and does NOT throw when tx throws (error safety contract)', async () => {
    const badTx = {
      child: {
        findUniqueOrThrow: vi.fn().mockRejectedValue(new Error('DB connection lost')),
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earned = await checkAchievements('nonexistent-id', badTx as any)
    expect(earned).toEqual([])
  })

  it('does not return any badges when no conditions are met', async () => {
    const tx = makeTx({ totalMeals: 0 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earned = await checkAchievements('child-1', tx as any)
    expect(earned).toEqual([])
  })
})
