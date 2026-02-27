/**
 * TDD tests for daily goal gap suggestion pure logic
 * Run with: npx tsx --tsconfig tsconfig.json "src/app/api/child/[id]/suggestions/__tests__/logic.test.ts"
 *
 * RED:  fails because logic.ts does not exist yet
 * GREEN: passes once logic.ts is implemented
 */
import assert from "node:assert/strict";
import {
  aggregateTodayIntake,
  computeGaps,
  isOnTrack,
  buildSuggestionPrompt,
} from "../logic";

// ─── aggregateTodayIntake ──────────────────────────────────────────────────────

const mockMealLogs = [
  {
    nutrients: [
      { nutrient: "calories", amount: 400, unit: "kcal" },
      { nutrient: "protein", amount: 15, unit: "g" },
    ],
  },
  {
    // Second meal — nutrients should be summed
    nutrients: [
      { nutrient: "calories", amount: 200, unit: "kcal" },
      { nutrient: "calcium", amount: 300, unit: "mg" },
    ],
  },
];

const intakeMap = aggregateTodayIntake(mockMealLogs);

assert.equal(intakeMap["calories"], 600, "calories summed across two meals");
assert.equal(intakeMap["protein"], 15, "protein from first meal");
assert.equal(intakeMap["calcium"], 300, "calcium from second meal");
assert.equal(intakeMap["iron"], undefined, "unlogged nutrient is absent");
console.log("✓ aggregateTodayIntake sums nutrients correctly");

const emptyIntake = aggregateTodayIntake([]);
assert.deepEqual(emptyIntake, {}, "empty logs produce empty map");
console.log("✓ aggregateTodayIntake handles empty logs");

// ─── computeGaps ──────────────────────────────────────────────────────────────

const targets = [
  { nutrient: "calories", target: 1200, unit: "kcal" },
  { nutrient: "protein", target: 50, unit: "g" },
  { nutrient: "calcium", target: 800, unit: "mg" },
  { nutrient: "vitaminD", target: 0, unit: "IU" }, // target=0 → excluded
];

const intake = { calories: 600, protein: 40, calcium: 0 };

const gaps = computeGaps(targets, intake);

// vitaminD has target=0 → excluded
assert.equal(gaps.length, 3, "nutrients with target=0 are excluded");

// calcium: (800-0)/800 = 100% remaining → highest gap → first
assert.equal(gaps[0].nutrient, "calcium", "calcium is the biggest gap (100% remaining)");
assert.equal(gaps[0].remaining, 800, "calcium remaining is 800");
assert.equal(gaps[0].percentRemaining, 1, "calcium percentRemaining is 1.0");
assert.equal(gaps[0].unit, "mg", "unit preserved");

// calories: (1200-600)/1200 = 50% remaining → second
assert.equal(gaps[1].nutrient, "calories", "calories is second gap");
assert.equal(gaps[1].remaining, 600, "calorie remaining is 600");
assert.ok(
  Math.abs(gaps[1].percentRemaining - 0.5) < 0.001,
  "calories percentRemaining ~0.5",
);

// protein: (50-40)/50 = 20% remaining → third
assert.equal(gaps[2].nutrient, "protein", "protein is third gap");
assert.equal(gaps[2].remaining, 10, "protein remaining is 10");
assert.ok(
  Math.abs(gaps[2].percentRemaining - 0.2) < 0.001,
  "protein percentRemaining ~0.2",
);
console.log("✓ computeGaps returns sorted gaps (descending), excludes zero-target nutrients");

// ─── isOnTrack ─────────────────────────────────────────────────────────────────

// percentRemaining = (1200-900)/1200 = 0.25 < 0.30 → on track (no suggestion needed)
assert.equal(isOnTrack(1200, 900), true, "75% consumed → on track (< 30% remaining)");

// percentRemaining = (1200-600)/1200 = 0.50 ≥ 0.30 → not on track (suggestion needed)
assert.equal(isOnTrack(1200, 600), false, "50% consumed → not on track (50% remaining)");

// percentRemaining = (1200-840)/1200 = 0.30 → NOT < 0.30 → NOT on track (strict boundary)
assert.equal(isOnTrack(1200, 840), false, "exactly 30% remaining → suggestion warranted (strict < threshold)");

// No calorie target → treat as on track
assert.equal(isOnTrack(0, 0), true, "zero target → on track");
console.log("✓ isOnTrack uses < 0.30 threshold correctly");

// ─── buildSuggestionPrompt ────────────────────────────────────────────────────

const gap1 = { nutrient: "calcium", remaining: 800, unit: "mg", target: 800, intake: 0, percentRemaining: 1 };
const gap2 = { nutrient: "protein", remaining: 10, unit: "g", target: 50, intake: 40, percentRemaining: 0.2 };

const prompt = buildSuggestionPrompt("Emma", 8, [gap1, gap2], 400, 1200);

assert.ok(prompt.startsWith("You are Nouri."), "prompt starts with 'You are Nouri.'");
console.log("✓ buildSuggestionPrompt: starts correctly");

assert.ok(prompt.includes("Emma"), "prompt includes child name");
assert.ok(prompt.includes("8"), "prompt includes child age");
console.log("✓ buildSuggestionPrompt: includes child context");

assert.ok(prompt.includes("calcium"), "prompt mentions gap1 nutrient");
assert.ok(prompt.includes("800"), "prompt mentions gap1 remaining amount");
assert.ok(prompt.includes("mg"), "prompt mentions gap1 unit");
assert.ok(prompt.includes("protein"), "prompt mentions gap2 nutrient");
console.log("✓ buildSuggestionPrompt: includes both gap details");

assert.ok(prompt.includes("400"), "prompt mentions calorie intake");
assert.ok(prompt.includes("1200"), "prompt mentions calorie target");
console.log("✓ buildSuggestionPrompt: includes calorie context");

assert.ok(prompt.includes("25 words"), "prompt includes 25-word max constraint");
console.log("✓ buildSuggestionPrompt: includes word limit");

// Must instruct to use name and be kid-friendly
assert.ok(prompt.toLowerCase().includes("emma"), "prompt references name for use");
console.log("✓ buildSuggestionPrompt: child name referenced");

console.log("\n✅ All suggestions logic tests passed!");
