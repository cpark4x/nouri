/**
 * Pure helper functions for weekly nutrition aggregation.
 * Kept separate from the route handler so they can be unit-tested without
 * any Next.js or Prisma dependencies.
 */

export type IntakeMap = Record<string, Record<string, number>>;
export type Targets = Record<string, { target: number; unit: string }>;

export interface DayData {
  date: string;
  dayLabel: string;
  intake: Record<string, number>;
  percentOfTarget: Record<string, number>;
}

/**
 * Returns an array of 7 ISO-date strings (YYYY-MM-DD) for the window
 * ending on `endDateStr` (inclusive).  Accepts a YYYY-MM-DD string so that
 * arithmetic is purely UTC and independent of the server's local timezone.
 */
export function buildDateRange(endDateStr: string): string[] {
  const [year, month, day] = endDateStr.split("-").map(Number);
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1, day - i));
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Returns an abbreviated weekday name ("Mon", "Tue", …) for an ISO date string.
 * Uses the UTC timezone so the label matches the UTC date, not local time.
 */
export function getDayLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

/**
 * Aggregates nutrient amounts from meal logs into a nested map keyed by
 * UTC date string → nutrient name → total amount.
 */
export function aggregateIntakeByDate(
  mealLogs: Array<{
    date: Date;
    nutrients: Array<{ nutrient: string; amount: number; unit: string }>;
  }>,
): IntakeMap {
  const map: IntakeMap = {};
  for (const log of mealLogs) {
    const dateStr = log.date.toISOString().slice(0, 10);
    if (!map[dateStr]) map[dateStr] = {};
    for (const entry of log.nutrients) {
      map[dateStr][entry.nutrient] =
        (map[dateStr][entry.nutrient] ?? 0) + entry.amount;
    }
  }
  return map;
}

/**
 * Builds the ordered `days` array from a date range, an intake map, and the
 * child's targets.  Missing nutrients default to 0; percentOfTarget uses
 * Math.round.
 */
export function buildDays(
  dateRange: string[],
  intakeMap: IntakeMap,
  targets: Targets,
): DayData[] {
  const nutrientKeys = Object.keys(targets);
  return dateRange.map((dateStr) => {
    const dayIntake = intakeMap[dateStr] ?? {};
    const intake: Record<string, number> = {};
    const percentOfTarget: Record<string, number> = {};

    for (const nutrient of nutrientKeys) {
      const amount = dayIntake[nutrient] ?? 0;
      intake[nutrient] = amount;
      const targetVal = targets[nutrient].target;
      percentOfTarget[nutrient] =
        targetVal > 0 ? Math.round((amount / targetVal) * 100) : 0;
    }

    return { date: dateStr, dayLabel: getDayLabel(dateStr), intake, percentOfTarget };
  });
}

/**
 * Calculates weekly averages (intake and % of target) across all days.
 * Averages are rounded to the nearest integer.
 */
export function calculateWeeklyStats(
  days: DayData[],
  targets: Targets,
): {
  weeklyAverages: Record<string, number>;
  weeklyAveragePercent: Record<string, number>;
} {
  const n = days.length;
  const weeklyAverages: Record<string, number> = {};
  const weeklyAveragePercent: Record<string, number> = {};

  for (const nutrient of Object.keys(targets)) {
    const totalIntake = days.reduce(
      (sum, day) => sum + (day.intake[nutrient] ?? 0),
      0,
    );
    const totalPercent = days.reduce(
      (sum, day) => sum + (day.percentOfTarget[nutrient] ?? 0),
      0,
    );
    weeklyAverages[nutrient] = n > 0 ? Math.round(totalIntake / n) : 0;
    weeklyAveragePercent[nutrient] = n > 0 ? Math.round(totalPercent / n) : 0;
  }

  return { weeklyAverages, weeklyAveragePercent };
}
