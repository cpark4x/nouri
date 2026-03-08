/**
 * Tests for calculateStreak — consecutive-days-with-meals counter.
 * Uses relative imports (no @/ aliases — vitest has no config file).
 */
import { describe, it, expect } from "vitest";
import { calculateStreak } from "../logic";

// Helper: build a UTC midnight Date n days before `today`
function daysAgo(n: number, today: Date): Date {
  return new Date(today.getTime() - n * 86_400_000);
}

describe("calculateStreak", () => {
  it("returns 0 when there are no meal logs", () => {
    const today = new Date("2026-03-08T10:00:00Z");
    expect(calculateStreak([], today)).toBe(0);
  });

  it("returns 0 when meals exist but not today", () => {
    const today = new Date("2026-03-08T10:00:00Z");
    // Only yesterday has a meal
    const dates = [daysAgo(1, today)];
    expect(calculateStreak(dates, today)).toBe(0);
  });

  it("returns 1 when only today has a meal", () => {
    const today = new Date("2026-03-08T10:00:00Z");
    expect(calculateStreak([today], today)).toBe(1);
  });

  it("returns 3 for three consecutive days ending today", () => {
    const today = new Date("2026-03-08T10:00:00Z");
    const dates = [today, daysAgo(1, today), daysAgo(2, today)];
    expect(calculateStreak(dates, today)).toBe(3);
  });

  it("stops at the first gap — today + day-before-yesterday = 1", () => {
    const today = new Date("2026-03-08T10:00:00Z");
    // Today has a meal; yesterday does NOT; two days ago has a meal
    const dates = [today, daysAgo(2, today)];
    expect(calculateStreak(dates, today)).toBe(1);
  });

  it("counts multiple meals on the same day as a single streak day", () => {
    const today = new Date("2026-03-08T10:00:00Z");
    const todayNoon = new Date("2026-03-08T12:00:00Z");
    const todayEve = new Date("2026-03-08T18:00:00Z");
    // Three logs on today, two on yesterday
    const dates = [today, todayNoon, todayEve, daysAgo(1, today), daysAgo(1, today)];
    expect(calculateStreak(dates, today)).toBe(2);
  });

  it("caps at 30 even if all days have meals", () => {
    const today = new Date("2026-03-08T10:00:00Z");
    // Build 35 consecutive days ending today
    const dates: Date[] = [];
    for (let i = 0; i < 35; i++) {
      dates.push(daysAgo(i, today));
    }
    expect(calculateStreak(dates, today)).toBe(30);
  });

  it("is not affected by logs older than the 30-day window when gap exists at day 29", () => {
    const today = new Date("2026-03-08T10:00:00Z");
    // Days 0-28 have meals (29 days), day 29 is missing, day 30+ exist
    const dates: Date[] = [];
    for (let i = 0; i < 29; i++) {
      dates.push(daysAgo(i, today));
    }
    // skip day 29
    dates.push(daysAgo(30, today));
    expect(calculateStreak(dates, today)).toBe(29);
  });
});
