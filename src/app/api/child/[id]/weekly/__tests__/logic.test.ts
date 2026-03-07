/**
 * TDD tests for weekly nutrition aggregation pure logic
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  buildDateRange,
  getDayLabel,
  aggregateIntakeByDate,
  buildDays,
  calculateWeeklyStats,
} from "../logic";

describe("buildDateRange", () => {
  it("returns 7 sequential dates ending on the given date", () => {
    // 2026-02-26 is Thursday; 7 days = Feb 20–Feb 26
    const range = buildDateRange("2026-02-26");
    assert.equal(range.length, 7);
    assert.equal(range[0], "2026-02-20");
    assert.equal(range[6], "2026-02-26");
    for (let i = 1; i < range.length; i++) {
      const prev = new Date(range[i - 1]);
      const curr = new Date(range[i]);
      assert.equal(
        curr.getTime() - prev.getTime(),
        86_400_000,
        `dates[${i}] must be exactly 1 day after dates[${i - 1}]`,
      );
    }
  });
});

describe("getDayLabel", () => {
  it("returns correct abbreviated day names", () => {
    assert.equal(getDayLabel("2026-02-26"), "Thu");
    assert.equal(getDayLabel("2026-02-20"), "Fri");
    assert.equal(getDayLabel("2026-02-23"), "Mon");
    assert.equal(getDayLabel("2026-02-21"), "Sat");
  });
});

const mockMealLogs = [
  {
    date: new Date("2026-02-24T12:00:00.000Z"),
    nutrients: [
      { nutrient: "calories", amount: 300, unit: "kcal" },
      { nutrient: "protein", amount: 10, unit: "g" },
    ],
  },
  {
    date: new Date("2026-02-24T18:00:00.000Z"),
    nutrients: [
      { nutrient: "calories", amount: 200, unit: "kcal" },
      { nutrient: "iron", amount: 5, unit: "mg" },
    ],
  },
  {
    date: new Date("2026-02-25T12:00:00.000Z"),
    nutrients: [{ nutrient: "calories", amount: 400, unit: "kcal" }],
  },
];

describe("aggregateIntakeByDate", () => {
  it("sums nutrients correctly per day", () => {
    const intakeMap = aggregateIntakeByDate(mockMealLogs);
    assert.equal(intakeMap["2026-02-24"]?.calories, 500);
    assert.equal(intakeMap["2026-02-24"]?.protein, 10);
    assert.equal(intakeMap["2026-02-24"]?.iron, 5);
    assert.equal(intakeMap["2026-02-25"]?.calories, 400);
    assert.equal(intakeMap["2026-02-26"], undefined);
  });
});

describe("buildDays", () => {
  const targets = {
    calories: { target: 1000, unit: "kcal" },
    protein: { target: 50, unit: "g" },
  };

  const intakeMap = aggregateIntakeByDate(mockMealLogs);
  const dateRange = ["2026-02-24", "2026-02-25", "2026-02-26"];
  const days = buildDays(dateRange, intakeMap, targets);

  it("constructs correct structure with percentOfTarget", () => {
    assert.equal(days.length, 3);
    // Feb 24 — 500 cal (50%), 10g protein (20%)
    assert.equal(days[0].date, "2026-02-24");
    assert.equal(days[0].dayLabel, "Tue");
    assert.equal(days[0].intake.calories, 500);
    assert.equal(days[0].intake.protein, 10);
    assert.equal(days[0].percentOfTarget.calories, 50);
    assert.equal(days[0].percentOfTarget.protein, 20);
    // Feb 25 — 400 cal (40%), protein missing → 0
    assert.equal(days[1].intake.calories, 400);
    assert.equal(days[1].intake.protein, 0);
    assert.equal(days[1].percentOfTarget.calories, 40);
    assert.equal(days[1].percentOfTarget.protein, 0);
    // Feb 26 — no log → all 0
    assert.equal(days[2].intake.calories, 0);
    assert.equal(days[2].percentOfTarget.calories, 0);
  });

  it("rounds percentOfTarget using Math.round", () => {
    const targetsRound = { calories: { target: 3000, unit: "kcal" } };
    const daysRound = buildDays(
      ["2026-02-24"],
      { "2026-02-24": { calories: 1005 } },
      targetsRound,
    );
    // 1005/3000 * 100 = 33.5 → 34
    assert.equal(daysRound[0].percentOfTarget.calories, 34);
  });
});

describe("calculateWeeklyStats", () => {
  const targets = {
    calories: { target: 1000, unit: "kcal" },
    protein: { target: 50, unit: "g" },
  };

  const fullDays = [
    { date: "2026-02-24", dayLabel: "Tue", intake: { calories: 500 }, percentOfTarget: { calories: 50 } },
    { date: "2026-02-25", dayLabel: "Wed", intake: { calories: 1000 }, percentOfTarget: { calories: 100 } },
    { date: "2026-02-26", dayLabel: "Thu", intake: { calories: 0 }, percentOfTarget: { calories: 0 } },
  ];

  it("computes correct weekly averages", () => {
    const { weeklyAverages, weeklyAveragePercent } = calculateWeeklyStats(fullDays, targets);
    // (500 + 1000 + 0) / 3 = 500
    assert.equal(weeklyAverages.calories, 500);
    // (50 + 100 + 0) / 3 ≈ 50
    assert.equal(weeklyAveragePercent.calories, 50);
    // protein missing in days → defaults to 0
    assert.equal(weeklyAverages.protein ?? 0, 0);
  });
});
