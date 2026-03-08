/**
 * Pure date utility functions for dashboard day navigation and streak calculation.
 * No external dependencies — all functions are trivially testable.
 */

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ---------------------------------------------------------------------------
// API helpers — used by route.ts
// ---------------------------------------------------------------------------

/**
 * Parse a `?date=` query param (YYYY-MM-DD ISO string).
 * Returns today at midnight UTC if the param is absent or invalid.
 */
export function parseDateParam(param: string | null): Date {
  if (!param) {
    return todayUTC();
  }
  // Append T00:00:00Z so new Date() treats it as midnight UTC
  const d = new Date(param + "T00:00:00Z");
  if (isNaN(d.getTime())) {
    return todayUTC();
  }
  return d;
}

/**
 * Given a date, return { start, end } representing midnight-to-midnight UTC
 * for that calendar day. Used as `gte: start, lt: end` in Prisma where clauses.
 */
export function buildDateWindow(date: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end };
}

// ---------------------------------------------------------------------------
// Client-side navigation helpers — used by page.tsx
// ---------------------------------------------------------------------------

/**
 * Returns today at midnight UTC (anchors all day comparisons to UTC).
 */
function todayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

/**
 * Returns a new Date that is `n` days before `date`. Does not mutate input.
 */
export function subDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * Returns a new Date that is `n` days after `date`. Does not mutate input.
 */
export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Returns true if `a` and `b` represent the same local calendar day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Returns true if `date` is yesterday in local time.
 */
export function isYesterday(date: Date): boolean {
  return isSameDay(date, subDays(new Date(), 1));
}

/**
 * Formats a Date as "YYYY-MM-DD" for use as a `?date=` query param.
 */
export function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns a human-readable label for the date navigator:
 * "Today", "Yesterday", or "Feb 15".
 */
export function formatDateLabel(date: Date): string {
  if (isSameDay(date, new Date())) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

// ---------------------------------------------------------------------------
// Streak calculation — used by API route
// ---------------------------------------------------------------------------

/**
 * Count consecutive days (from today backwards) that have ≥1 meal logged.
 * Stops at the first day with no meals; looks back at most 30 days.
 *
 * @param mealLogDates - The `date` field from each MealLog record (UTC Date objects)
 * @param today        - Override for "today"; defaults to `new Date()`. Useful for testing.
 * @returns Number of consecutive days ending today that have at least one meal.
 *
 * @example
 *   // Today + yesterday have meals → streak is 2
 *   calculateStreak([new Date(), subDays(new Date(), 1)]) // 2
 */
export function calculateStreak(mealLogDates: Date[], today?: Date): number {
  const now = today ?? new Date();
  // Anchor to midnight UTC so comparisons are day-aligned
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // Build a set of "Y-M-D" UTC keys for every day that has at least one meal
  const daysWithMeals = new Set(
    mealLogDates.map(
      (d) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
    )
  );

  let streak = 0;
  let cursor = todayStart;

  for (let i = 0; i < 30; i++) {
    const key = `${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}-${cursor.getUTCDate()}`;
    if (daysWithMeals.has(key)) {
      streak++;
      cursor = new Date(cursor.getTime() - 86_400_000); // step back one day
    } else {
      break; // gap found — streak ends
    }
  }

  return streak;
}
