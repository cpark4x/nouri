/**
 * TDD tests for dashboard date filtering and navigation logic
 */
import { describe, it, expect } from "vitest";
import {
  parseDateParam,
  buildDateWindow,
  subDays,
  addDays,
  isSameDay,
  isYesterday,
  toDateParam,
  formatDateLabel,
} from "../logic";

describe("parseDateParam", () => {
  it("returns today for null input", () => {
    const result = parseDateParam(null);
    const today = new Date();
    expect(result.getUTCFullYear()).toBe(today.getUTCFullYear());
    expect(result.getUTCMonth()).toBe(today.getUTCMonth());
    expect(result.getUTCDate()).toBe(today.getUTCDate());
  });

  it("parses a valid ISO date string", () => {
    const result = parseDateParam("2026-02-15");
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(1); // 0-indexed
    expect(result.getUTCDate()).toBe(15);
  });

  it("returns today for an invalid date string", () => {
    const result = parseDateParam("not-a-date");
    const today = new Date();
    expect(result.getUTCDate()).toBe(today.getUTCDate());
  });

  it("returns date at midnight UTC", () => {
    const result = parseDateParam("2026-03-15");
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
  });
});

describe("buildDateWindow", () => {
  it("returns start and end bracketing the full day", () => {
    const date = new Date("2026-02-15T00:00:00Z");
    const { start, end } = buildDateWindow(date);
    expect(start.toISOString()).toBe("2026-02-15T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-02-16T00:00:00.000Z");
  });

  it("end is exactly 24 hours after start", () => {
    const date = new Date("2026-03-01T00:00:00Z");
    const { start, end } = buildDateWindow(date);
    expect(end.getTime() - start.getTime()).toBe(86_400_000);
  });
});

describe("subDays", () => {
  it("subtracts one day", () => {
    const base = new Date("2026-03-07T12:00:00");
    const result = subDays(base, 1);
    expect(result.getDate()).toBe(6);
    expect(result.getMonth()).toBe(2); // March = index 2
  });

  it("does not mutate the original date", () => {
    const base = new Date("2026-03-07T12:00:00");
    subDays(base, 1);
    expect(base.getDate()).toBe(7);
  });
});

describe("addDays", () => {
  it("adds one day", () => {
    const base = new Date("2026-03-07T12:00:00");
    const result = addDays(base, 1);
    expect(result.getDate()).toBe(8);
  });

  it("does not mutate the original date", () => {
    const base = new Date("2026-03-07T12:00:00");
    addDays(base, 1);
    expect(base.getDate()).toBe(7);
  });
});

describe("isSameDay", () => {
  it("returns true for same calendar day at different times", () => {
    const a = new Date("2026-03-07T08:00:00");
    const b = new Date("2026-03-07T22:00:00");
    expect(isSameDay(a, b)).toBe(true);
  });

  it("returns false for different calendar days", () => {
    const a = new Date("2026-03-07T08:00:00");
    const b = new Date("2026-03-08T08:00:00");
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe("isYesterday", () => {
  it("returns false for today", () => {
    expect(isYesterday(new Date())).toBe(false);
  });

  it("returns true for yesterday", () => {
    const yesterday = subDays(new Date(), 1);
    expect(isYesterday(yesterday)).toBe(true);
  });

  it("returns false for two days ago", () => {
    const twoDaysAgo = subDays(new Date(), 2);
    expect(isYesterday(twoDaysAgo)).toBe(false);
  });
});

describe("toDateParam", () => {
  it("formats a date as YYYY-MM-DD", () => {
    const date = new Date("2026-02-15T12:00:00");
    expect(toDateParam(date)).toBe("2026-02-15");
  });

  it("pads month and day with leading zeros", () => {
    const date = new Date("2026-01-09T12:00:00");
    expect(toDateParam(date)).toBe("2026-01-09");
  });
});

describe("formatDateLabel", () => {
  it('returns "Today" for today', () => {
    expect(formatDateLabel(new Date())).toBe("Today");
  });

  it('returns "Yesterday" for yesterday', () => {
    const yesterday = subDays(new Date(), 1);
    expect(formatDateLabel(yesterday)).toBe("Yesterday");
  });

  it("returns month abbreviation and day for older dates", () => {
    const date = new Date("2026-02-15T12:00:00");
    expect(formatDateLabel(date)).toBe("Feb 15");
  });
});
