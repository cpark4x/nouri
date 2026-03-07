/**
 * TDD tests for child detail date filtering logic (B7 — Past Meals History).
 * Mirrors the spec's test skeleton in b7-past-meals-history.md.
 */
import { describe, it, expect } from "vitest";
import { parseDateParam, buildDateWindow } from "../logic";

describe("parseDateParam", () => {
  it("returns today for null input", () => {
    const result = parseDateParam(null);
    const today = new Date();
    expect(result.getUTCDate()).toBe(today.getUTCDate());
  });

  it("parses a valid YYYY-MM-DD date string", () => {
    const result = parseDateParam("2026-01-20");
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(20);
  });

  it("falls back to today for garbage input", () => {
    const result = parseDateParam("banana");
    const today = new Date();
    expect(result.getUTCDate()).toBe(today.getUTCDate());
  });
});

describe("buildDateWindow", () => {
  it("spans exactly one calendar day", () => {
    const date = new Date("2026-01-20T00:00:00Z");
    const { start, end } = buildDateWindow(date);
    expect(end.getTime() - start.getTime()).toBe(86_400_000);
  });

  it("start is at midnight UTC", () => {
    const date = new Date("2026-01-20T15:00:00Z");
    const { start } = buildDateWindow(date);
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
  });
});
