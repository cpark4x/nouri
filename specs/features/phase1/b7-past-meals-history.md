# Spec: B7 — Past Meals History View

**Priority:** MEDIUM  
**Phase:** 1  
**Depends on:** B4 (day navigation) — shares the date filtering pattern

---

## Goal

Parents can browse what a child ate on any previous day from the child detail page. Currently the child detail page only shows today's meals (Today tab) and a 7-day chart (This Week tab). This spec adds a scrollable calendar date picker to the Today tab so parents can view "what did Mason eat last Tuesday?"

---

## Files Changed (≤5)

| File | Action | What changes |
|---|---|---|
| `src/app/(app)/child/[id]/page.tsx` | Modify | Add date navigation (same pattern as B4 dashboard). Pass selectedDate to API calls. |
| `src/app/api/child/[id]/route.ts` | Modify | Accept `?date=` param, filter meal logs by date window |
| `src/app/api/child/[id]/__tests__/date-filter.test.ts` | New | Tests for date filtering logic |
| `src/app/api/child/[id]/logic.ts` | New | `parseDateParam()`, `buildDateWindow()` (or import from shared location if B4 already extracted these) |

**Note:** If B4 has already been implemented and extracted `parseDateParam` and `buildDateWindow` into a shared utility (e.g., `src/lib/date-utils.ts`), import from there instead of duplicating. Check `src/lib/` for existing date utilities first.

---

## Implementation

### 1. Child API (modify route.ts)

The existing `GET /api/child/[id]` route returns the child's full profile + today's meals. Add `?date=` support:

```typescript
const url = new URL(request.url)
const dateParam = url.searchParams.get('date')
// Use parseDateParam + buildDateWindow (from logic.ts or shared lib)
const targetDate = parseDateParam(dateParam)
const { start, end } = buildDateWindow(targetDate)

// In Prisma query for mealLogs:
mealLogs: {
  where: { date: { gte: start, lt: end } },
  include: { nutrients: true },
  orderBy: { date: 'asc' }
}
```

### 2. Child Detail Page (modify)

Add the same `< [Date label] >` navigation pattern from B4 at the top of the Today tab.

- `<` always enabled (can go back indefinitely)
- `>` disabled when viewing today
- Date label: "Today", "Yesterday", or "Mar 3"
- When date changes: re-fetch `GET /api/child/[id]?date=YYYY-MM-DD`

The existing `MealList` and `NutrientBar` components automatically render whatever data comes back — no changes needed to those components.

### 3. logic.ts (new or import from shared)

If `parseDateParam` and `buildDateWindow` are not yet in a shared location:

```typescript
// src/app/api/child/[id]/logic.ts
export function parseDateParam(param: string | null): Date
export function buildDateWindow(date: Date): { start: Date; end: Date }
```

These are identical to the B4 dashboard logic. If B4 has been shipped and these are already in `src/lib/date-utils.ts`, import from there.

---

## Test Skeleton

```typescript
// src/app/api/child/[id]/__tests__/date-filter.test.ts
import { describe, it, expect } from 'vitest'
import { parseDateParam, buildDateWindow } from '../logic'

describe('parseDateParam', () => {
  it('returns today for null input', () => {
    const result = parseDateParam(null)
    const today = new Date()
    expect(result.getUTCDate()).toBe(today.getUTCDate())
  })

  it('parses a valid YYYY-MM-DD date string', () => {
    const result = parseDateParam('2026-01-20')
    expect(result.getUTCFullYear()).toBe(2026)
    expect(result.getUTCMonth()).toBe(0)
    expect(result.getUTCDate()).toBe(20)
  })

  it('falls back to today for garbage input', () => {
    const result = parseDateParam('banana')
    const today = new Date()
    expect(result.getUTCDate()).toBe(today.getUTCDate())
  })
})

describe('buildDateWindow', () => {
  it('spans exactly one calendar day', () => {
    const date = new Date('2026-01-20T00:00:00Z')
    const { start, end } = buildDateWindow(date)
    expect(end.getTime() - start.getTime()).toBe(86_400_000)
  })

  it('start is at midnight UTC', () => {
    const date = new Date('2026-01-20T15:00:00Z')
    const { start } = buildDateWindow(date)
    expect(start.getUTCHours()).toBe(0)
    expect(start.getUTCMinutes()).toBe(0)
  })
})
```

---

## Acceptance Criteria

- [ ] Child detail Today tab has `< [Date] >` navigation arrows
- [ ] Navigating to a previous date shows that day's meals and nutrient bars
- [ ] `>` arrow disabled when viewing today
- [ ] API route accepts `?date=` param and filters meals correctly
- [ ] If no meals on selected day, shows empty state (existing behavior)
- [ ] `npm test` passes (new tests included)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
