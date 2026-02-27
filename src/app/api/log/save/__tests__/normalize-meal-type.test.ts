/**
 * TDD tests for mealType normalization logic
 * Run with: npx tsx "src/app/api/log/save/__tests__/normalize-meal-type.test.ts"
 *
 * RED:  fails because normalize-meal-type.ts does not exist yet
 * GREEN: passes once normalize-meal-type.ts is implemented
 */
import assert from "node:assert/strict";
import { normalizeMealType, ALLOWED_MEAL_TYPES } from "../normalize-meal-type";

// ── ALLOWED_MEAL_TYPES order ──────────────────────────────────────────────────

assert.deepEqual(
  ALLOWED_MEAL_TYPES,
  ["breakfast", "lunch", "snack", "dinner"],
  "ALLOWED_MEAL_TYPES must be in breakfast → lunch → snack → dinner order",
);
console.log("✓ ALLOWED_MEAL_TYPES order is correct");

// ── Valid lowercase values ────────────────────────────────────────────────────

assert.equal(normalizeMealType("breakfast"), "breakfast", "lowercase breakfast accepted");
assert.equal(normalizeMealType("lunch"), "lunch", "lowercase lunch accepted");
assert.equal(normalizeMealType("snack"), "snack", "lowercase snack accepted");
assert.equal(normalizeMealType("dinner"), "dinner", "lowercase dinner accepted");
console.log("✓ All lowercase meal types accepted");

// ── Capitalized values are normalized ────────────────────────────────────────

assert.equal(normalizeMealType("Breakfast"), "breakfast", "Breakfast → breakfast");
assert.equal(normalizeMealType("Lunch"), "lunch", "Lunch → lunch");
assert.equal(normalizeMealType("Snack"), "snack", "Snack → snack");
assert.equal(normalizeMealType("Dinner"), "dinner", "Dinner → dinner");
console.log("✓ Capitalized values are normalized to lowercase");

// ── Whitespace is trimmed ─────────────────────────────────────────────────────

assert.equal(normalizeMealType("  lunch  "), "lunch", "whitespace trimmed");
assert.equal(normalizeMealType("\tbreakfast\n"), "breakfast", "tabs/newlines trimmed");
console.log("✓ Whitespace is trimmed");

// ── Invalid values return null ────────────────────────────────────────────────

assert.equal(normalizeMealType("brunch"), null, "brunch is not a valid meal type");
assert.equal(normalizeMealType(""), null, "empty string is invalid");
assert.equal(normalizeMealType("meal"), null, "arbitrary string is invalid");
assert.equal(normalizeMealType("DINNER"), "dinner", "DINNER normalizes to dinner via toLowerCase");
console.log("✓ Invalid values return null, valid all-caps values normalize");

console.log("\n✅ All normalize-meal-type tests passed!");
