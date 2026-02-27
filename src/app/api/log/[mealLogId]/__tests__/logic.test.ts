/**
 * TDD tests for [mealLogId] route pure logic
 * Run with: npx tsx "src/app/api/log/[mealLogId]/__tests__/logic.test.ts"
 *
 * RED:  fails because logic.ts does not exist yet
 * GREEN: passes once logic.ts is implemented
 */
import assert from "node:assert/strict";
import { buildNutritionEntries, validateDescription } from "../logic";

// ── validateDescription ───────────────────────────────────────────────────────

assert.equal(validateDescription("grilled chicken and rice"), null, "valid description returns null");
console.log("✓ validateDescription: valid string returns null");

assert.ok(validateDescription("") !== null, "empty string is invalid");
console.log("✓ validateDescription: empty string is invalid");

assert.ok(validateDescription("   ") !== null, "whitespace-only is invalid");
console.log("✓ validateDescription: whitespace-only is invalid");

assert.ok(validateDescription(null) !== null, "null is invalid");
console.log("✓ validateDescription: null is invalid");

assert.ok(validateDescription(undefined) !== null, "undefined is invalid");
console.log("✓ validateDescription: undefined is invalid");

assert.ok(validateDescription(42) !== null, "number is invalid");
console.log("✓ validateDescription: non-string is invalid");

// ── buildNutritionEntries ─────────────────────────────────────────────────────

const fullNutrition = {
  calories: 400,
  protein: 12,
  calcium: 200,
  vitaminD: 100,
  iron: 3,
  zinc: 2,
  magnesium: 40,
  potassium: 300,
  vitaminA: 50,
  vitaminC: 15,
  fiber: 5,
  omega3: 0, // zero — should be filtered out
};

const entries = buildNutritionEntries(fullNutrition);

// Zero-value nutrients are excluded
assert.ok(
  !entries.some((e) => e.amount === 0),
  "zero-amount nutrients are filtered out",
);
console.log("✓ buildNutritionEntries: zero nutrients filtered out");

// omega3=0 specifically excluded
assert.ok(
  !entries.some((e) => e.nutrient === "omega3"),
  "omega3 excluded when zero",
);
console.log("✓ buildNutritionEntries: omega3 excluded when zero");

// Non-zero nutrients are included
assert.ok(
  entries.some((e) => e.nutrient === "calories" && e.amount === 400),
  "calories included with correct amount",
);
console.log("✓ buildNutritionEntries: calories included with correct amount");

// Units are correct
const calorieEntry = entries.find((e) => e.nutrient === "calories");
assert.equal(calorieEntry?.unit, "kcal", "calories unit is kcal");
console.log("✓ buildNutritionEntries: calories unit is kcal");

const proteinEntry = entries.find((e) => e.nutrient === "protein");
assert.equal(proteinEntry?.unit, "g", "protein unit is g");
console.log("✓ buildNutritionEntries: protein unit is g");

const ironEntry = entries.find((e) => e.nutrient === "iron");
assert.equal(ironEntry?.unit, "mg", "iron unit is mg");
console.log("✓ buildNutritionEntries: iron unit is mg");

// All-zero nutrition returns empty array
const zeroNutrition = {
  calories: 0,
  protein: 0,
  calcium: 0,
  vitaminD: 0,
  iron: 0,
  zinc: 0,
  magnesium: 0,
  potassium: 0,
  vitaminA: 0,
  vitaminC: 0,
  fiber: 0,
  omega3: 0,
};
const zeroEntries = buildNutritionEntries(zeroNutrition);
assert.equal(zeroEntries.length, 0, "all-zero nutrition returns empty array");
console.log("✓ buildNutritionEntries: all-zero nutrition returns empty array");

console.log("\n✅ All [mealLogId] logic tests passed!");
