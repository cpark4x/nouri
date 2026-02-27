/**
 * TDD tests for per-meal tip pure logic
 * Run with: npx tsx "src/app/api/log/[mealLogId]/tip/__tests__/logic.test.ts"
 *
 * RED:  fails because logic.ts does not exist yet
 * GREEN: passes once logic.ts is implemented
 */
import assert from "node:assert/strict";
import { calculateNutrientPercents, buildTipPrompt } from "../logic";

// ── calculateNutrientPercents ─────────────────────────────────────────────────

const nutrients = [
  { nutrient: "calories", amount: 400, unit: "kcal" },
  { nutrient: "protein", amount: 12, unit: "g" },
  { nutrient: "calcium", amount: 200, unit: "mg" },
  { nutrient: "iron", amount: 3, unit: "mg" },
];

const dailyTargets = [
  { nutrient: "calories", target: 2000, unit: "kcal" },
  { nutrient: "protein", target: 50, unit: "g" },
  { nutrient: "calcium", target: 1000, unit: "mg" },
  // iron intentionally absent from dailyTargets
];

const percents = calculateNutrientPercents(nutrients, dailyTargets);

// calories: 400 / 2000 * 100 = 20
assert.equal(percents["calories"]?.percent, 20, "calories: 20% of daily target");
assert.equal(percents["calories"]?.amount, 400, "calories: amount preserved");
assert.equal(percents["calories"]?.unit, "kcal", "calories: unit preserved");
console.log("✓ calculateNutrientPercents: calories correct");

// protein: 12 / 50 * 100 = 24
assert.equal(percents["protein"]?.percent, 24, "protein: 24% of daily target");
console.log("✓ calculateNutrientPercents: protein correct");

// calcium: 200 / 1000 * 100 = 20
assert.equal(percents["calcium"]?.percent, 20, "calcium: 20% of daily target");
console.log("✓ calculateNutrientPercents: calcium correct");

// iron has no daily target → percent should be null
assert.equal(percents["iron"]?.percent, null, "iron: null percent when no target");
assert.equal(percents["iron"]?.amount, 3, "iron: amount still preserved");
console.log("✓ calculateNutrientPercents: null percent when target missing");

// rounding: 1005 / 3000 * 100 = 33.5 → 34
const percentsRound = calculateNutrientPercents(
  [{ nutrient: "calories", amount: 1005, unit: "kcal" }],
  [{ nutrient: "calories", target: 3000, unit: "kcal" }],
);
assert.equal(percentsRound["calories"]?.percent, 34, "percent rounds via Math.round");
console.log("✓ calculateNutrientPercents: rounding correct");

// ── buildTipPrompt ───────────────────────────────────────────────────────────

const nutrientLines =
  "- Calories: 400 kcal (20% of daily target)\n" +
  "- Protein: 12 g (24% of daily target)\n" +
  "- Calcium: 200 mg (20% of daily target)";

const prompt = buildTipPrompt(
  "Mia",
  7,
  "soccer, 3x/week, high intensity",
  "peanut butter sandwich and apple",
  nutrientLines,
);

// Must start with "You are Nouri."
assert.ok(prompt.startsWith("You are Nouri."), "prompt starts with 'You are Nouri.'");
console.log("✓ buildTipPrompt: starts correctly");

// Must include child name, age, activity
assert.ok(prompt.includes("Mia"), "prompt includes child name");
assert.ok(prompt.includes("7"), "prompt includes child age");
assert.ok(prompt.includes("soccer"), "prompt includes activity summary");
console.log("✓ buildTipPrompt: includes child context");

// Must include meal description
assert.ok(
  prompt.includes("peanut butter sandwich and apple"),
  "prompt includes meal description",
);
console.log("✓ buildTipPrompt: includes meal description");

// Must include nutrient lines
assert.ok(prompt.includes(nutrientLines), "prompt includes nutrient lines");
console.log("✓ buildTipPrompt: includes nutrient lines");

// Must mention 20-word limit
assert.ok(prompt.includes("20 words"), "prompt includes 20-word max constraint");
console.log("✓ buildTipPrompt: includes word limit");

// Must instruct to name the child
assert.ok(
  prompt.toLowerCase().includes("mia"),
  "prompt instructs to use child's name",
);
console.log("✓ buildTipPrompt: child name referenced");

console.log("\n✅ All tip logic tests passed!");
