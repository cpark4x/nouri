# Spec: B4 — Homepage Day Navigation

**Priority:** HIGH — core daily-use UX  
**Phase:** 1  
**Depends on:** None (standalone dashboard enhancement)

---

## Goal

From the home dashboard, parents can tap `<` and `>` arrows to see what happened on previous days. The current date is shown as "Today", "Yesterday", or a date string. The meal lists and nutrient bars update to show that day's data.

---

## Files Changed (≤5)

| File | Action | What changes |
|---|---|---|
| `src/app/(app)/page.tsx` | Modify | Add `selectedDate` state + prev/next arrow controls. Pass date to dashboard API call. |
| `src/app/api/dashboard/route.ts` | Modify | Accept `?date=` query param (ISO string, defaults to today). Filter meals by that date. |
| `src/components/dashboard/child-card.tsx` | Modify | Accept `selectedDate` prop. Pass it when triggering data fetch. |
| `src/app/api/dashboard/__tests__/date-filter.test.ts` | New | Tests for date filtering logic |
| `src/app/api/dashboard/logic.ts` | New | `parseDateParam(param)`, `buildDateRange(date)` pure functions |

---

## Implementation

### 1. logic.ts (new)

```typescript
// src/app/api/dashboard/logic.ts

/**
 * Parse a date string from a query param. Returns today if invalid or absent.
 * Always returns a Date at midnight UTC.
 */
export function parseDateParam(param: string | null): Date

/**
 * Given a date, return startOfDay and endOfDay (UTC) for that date.
 */
export function buildDateWindow(date: Date): { start: Date; end: Date }
```

### 2. Dashboard API (modify route.ts)

Current: fetches all meals for today (hardcoded in Prisma query).  
Change: accept `?date=YYYY-MM-DD`, parse with `parseDateParam()`, use `buildDateWindow()` for the Prisma `where` filter.

```typescript
const url = new URL(request.url)
const dateParam = url.searchParams.get('date')
const targetDate = parseDateParam(dateParam)
const { start, end } = buildDateWindow(targetDate)

// In Prisma query:
where: {
  childId: child.id,
  date: { gte: start, lt: end }
}
```

### 3. page.tsx (modify)

Add state and controls:
```typescript
const [selectedDate, setSelectedDate] = useState<Date>(new Date())

const goBack = () => setSelectedDate(d => subDays(d, 1))
const goForward = () => setSelectedDate(d => addDays(d, 1))
const isToday = isSameDay(selectedDate, new Date())

// Date label
const dateLabel = isToday ? 'Today' 
  : isYesterday(selectedDate) ? 'Yesterday'
  : format(selectedDate, 'MMM d')
```

**Do NOT add date-fns as a dependency** — implement `subDays`, `addDays`, `isSameDay`, `isYesterday`, `format` as simple pure functions in `logic.ts`. They're trivial to implement for this use case.

UI layout at top of dashboard (above child cards):
```
< [Yesterday] >   (or < [Today] > with > disabled)
```
Arrow `>` is disabled (grayed) when selectedDate is today.

### 4. ChildCard (modify)

Accept `selectedDate: Date` prop. When `selectedDate` changes, re-fetch the child's data by appending `?date=YYYY-MM-DD` to the fetch URL.

Use the same `useEffect([selectedDate])` pattern that already exists for the `visible` prop.

---

## Test Skeleton

```typescript
// src/app/api/dashboard/__tests__/date-filter.test.ts
import { describe, it, expect } from 'vitest'
import { parseDateParam, buildDateWindow } from '../logic'

describe('parseDateParam', () => {
  it('returns today for null input', () => {
    const result = parseDateParam(null)
    const today = new Date()
    expect(result.getUTCFullYear()).toBe(today.getUTCFullYear())
    expect(result.getUTCMonth()).toBe(today.getUTCMonth())
    expect(result.getUTCDate()).toBe(today.getUTCDate())
  })

  it('parses a valid ISO date string', () => {
    const result = parseDateParam('2026-02-15')
    expect(result.getUTCFullYear()).toBe(2026)
    expect(result.getUTCMonth()).toBe(1)  // 0-indexed
    expect(result.getUTCDate()).toBe(15)
  })

  it('returns today for an invalid date string', () => {
    const result = parseDateParam('not-a-date')
    const today = new Date()
    expect(result.getUTCDate()).toBe(today.getUTCDate())
  })
})

describe('buildDateWindow', () => {
  it('returns start and end bracketing the full day', () => {
    const date = new Date('2026-02-15T00:00:00Z')
    const { start, end } = buildDateWindow(date)
    expect(start.toISOString()).toBe('2026-02-15T00:00:00.000Z')
    expect(end.toISOString()).toBe('2026-02-16T00:00:00.000Z')
  })

  it('end is exactly 24 hours after start', () => {
    const date = new Date('2026-03-01T00:00:00Z')
    const { start, end } = buildDateWindow(date)
    expect(end.getTime() - start.getTime()).toBe(86_400_000)
  })
})
```

---

## Acceptance Criteria

- [ ] `<` arrow navigates to yesterday, the day before, etc.
- [ ] `>` arrow is disabled when viewing today
- [ ] Date label shows "Today", "Yesterday", or "Feb 15"
- [ ] Nutrient bars and meal lists update when date changes
- [ ] Both child cards update to show the selected day's data
- [ ] No external date library added (pure functions only)
- [ ] `npm test` passes (new tests included)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
