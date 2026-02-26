/**
 * TDD tests for weekly nutrition aggregation pure logic
 * Run with: npx tsx "src/app/api/child/[id]/weekly/__tests__/logic.test.ts"
 *
 * RED:  fails because logic.ts does not exist yet
 * GREEN: passes once logic.ts is implemented
 */
import assert from "node:assert/strict";
import {
  buildDateRange,
  getDayLabel,
  aggregateIntakeByDate,
  buildDays,
  calculateWeeklyStats,
} from "../logic";

// ─── buildDateRange ──────────────────────────────────────────────────────────

// 2026-02-26 is a Thursday; 7 days ending on that date = Feb 20 – Feb 26
const endDate = new Date("2026-02-26T23:59:59.000Z");
const range = buildDateRange(endDate);

assert.equal(range.length, 7, "should return exactly 7 dates");
assert.equal(range[0], "2026-02-20", "first date should be 6 days before end");
assert.equal(range[6], "2026-02-26", "last date should be end date");
// all entries must be sequential
for (let i = 1; i < range.length; i++) {
  const prev = new Date(range[i - 1]);
  const curr = new Date(range[i]);
  assert.equal(
    curr.getTime() - prev.getTime(),
    86_400_000,
    `dates[${i}] must be exactly 1 day after dates[${i - 1}]`,
  );
}
console.log("✓ buildDateRange returns 7-day window in order");

// ─── getDayLabel ─────────────────────────────────────────────────────────────

assert.equal(getDayLabel("2026-02-26"), "Thu", "2026-02-26 is Thursday");
assert.equal(getDayLabel("2026-02-20"), "Fri", "2026-02-20 is Friday");
assert.equal(getDayLabel("2026-02-23"), "Mon", "2026-02-23 is Monday");
assert.equal(getDayLabel("2026-02-21"), "Sat", "2026-02-21 is Saturday");
console.log("✓ getDayLabel returns correct abbreviated day names");

// ─── aggregateIntakeByDate ───────────────────────────────────────────────────

const mockMealLogs = [
  {
    date: new Date("2026-02-24T12:00:00.000Z"),
    nutrients: [
      { nutrient: "calories", amount: 300, unit: "kcal" },
      { nutrient: "protein", amount: 10, unit: "g" },
    ],
  },
  {
    // Second meal same day — calories should be summed
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

const intakeMap = aggregateIntakeByDate(mockMealLogs);

assert.equal(intakeMap["2026-02-24"]?.calories, 500, "calories sum across 2 meals on same day");
assert.equal(intakeMap["2026-02-24"]?.protein, 10, "protein tracked for Feb 24");
assert.equal(intakeMap["2026-02-24"]?.iron, 5, "iron tracked for Feb 24");
assert.equal(intakeMap["2026-02-25"]?.calories, 400, "calories tracked for Feb 25");
assert.equal(intakeMap["2026-02-26"], undefined, "no entry for days with no logs");
console.log("✓ aggregateIntakeByDate sums nutrients correctly per day");

// ─── buildDays ───────────────────────────────────────────────────────────────

const targets = {
  calories: { target: 1000, unit: "kcal" },
  protein: { target: 50, unit: "g" },
};

const dateRange = ["2026-02-24", "2026-02-25", "2026-02-26"];
const days = buildDays(dateRange, intakeMap, targets);

assert.equal(days.length, 3, "should have 3 day entries");

// Feb 24 — 500 cal (50%), 10g protein (20%)
assert.equal(days[0].date, "2026-02-24");
assert.equal(days[0].dayLabel, "Tue");
assert.equal(days[0].intake.calories, 500);
assert.equal(days[0].intake.protein, 10);
assert.equal(days[0].percentOfTarget.calories, 50, "50% of 1000 target");
assert.equal(days[0].percentOfTarget.protein, 20, "20% of 50 target");

// Feb 25 — 400 cal (40%), protein missing → 0
assert.equal(days[1].intake.calories, 400);
assert.equal(days[1].intake.protein, 0, "missing nutrient defaults to 0");
assert.equal(days[1].percentOfTarget.calories, 40, "40% of 1000 target");
assert.equal(days[1].percentOfTarget.protein, 0, "0% when intake is 0");

// Feb 26 — no log at all → all 0
assert.equal(days[2].intake.calories, 0, "day with no log has 0 intake");
assert.equal(days[2].percentOfTarget.calories, 0, "0% when no log");
console.log("✓ buildDays constructs correct structure with percentOfTarget");

// percentOfTarget rounds via Math.round
const targetsRound = { calories: { target: 3000, unit: "kcal" } };
const daysRound = buildDays(
  ["2026-02-24"],
  { "2026-02-24": { calories: 1005 } },
  targetsRound,
);
// 1005/3000 * 100 = 33.5 → rounds to 34
assert.equal(daysRound[0].percentOfTarget.calories, 34, "percentOfTarget uses Math.round");
console.log("✓ percentOfTarget rounds correctly");

// ─── calculateWeeklyStats ────────────────────────────────────────────────────

const fullDays = [
  {
    date: "2026-02-24",
    dayLabel: "Tue",
    intake: { calories: 500 },
    percentOfTarget: { calories: 50 },
  },
  {
    date: "2026-02-25",
    dayLabel: "Wed",
    intake: { calories: 1000 },
    percentOfTarget: { calories: 100 },
  },
  {
    date: "2026-02-26",
    dayLabel: "Thu",
    intake: { calories: 0 },
    percentOfTarget: { calories: 0 },
  },
];

const { weeklyAverages, weeklyAveragePercent } = calculateWeeklyStats(
  fullDays,
  targets,
);

// avg intake: (500 + 1000 + 0) / 3 = 500
assert.equal(weeklyAverages.calories, 500, "weeklyAverages: (500+1000+0)/3 = 500");
// avg percent: (50 + 100 + 0) / 3 ≈ 50
assert.equal(
  weeklyAveragePercent.calories,
  50,
  "weeklyAveragePercent: (50+100+0)/3 = 50",
);
// protein had no intake in fullDays but IS in targets — should default to 0
assert.equal(weeklyAverages.protein ?? 0, 0, "missing nutrient averages to 0");
console.log("✓ calculateWeeklyStats computes correct averages");

console.log("\n✅ All weekly-logic tests passed!");
