/**
 * TDD tests for mealType normalization logic
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { normalizeMealType, ALLOWED_MEAL_TYPES } from "../normalize-meal-type";

describe("ALLOWED_MEAL_TYPES", () => {
  it("is in correct breakfast → lunch → snack → dinner order", () => {
    assert.deepEqual(ALLOWED_MEAL_TYPES, ["breakfast", "lunch", "snack", "dinner"]);
  });
});

describe("normalizeMealType", () => {
  it("accepts all lowercase valid meal types", () => {
    assert.equal(normalizeMealType("breakfast"), "breakfast");
    assert.equal(normalizeMealType("lunch"), "lunch");
    assert.equal(normalizeMealType("snack"), "snack");
    assert.equal(normalizeMealType("dinner"), "dinner");
  });

  it("normalizes capitalized values to lowercase", () => {
    assert.equal(normalizeMealType("Breakfast"), "breakfast");
    assert.equal(normalizeMealType("Lunch"), "lunch");
    assert.equal(normalizeMealType("Snack"), "snack");
    assert.equal(normalizeMealType("Dinner"), "dinner");
  });

  it("trims whitespace", () => {
    assert.equal(normalizeMealType("  lunch  "), "lunch");
    assert.equal(normalizeMealType("\tbreakfast\n"), "breakfast");
  });

  it("returns null for invalid meal types", () => {
    assert.equal(normalizeMealType("brunch"), null);
    assert.equal(normalizeMealType(""), null);
    assert.equal(normalizeMealType("meal"), null);
  });

  it("normalizes all-caps valid values", () => {
    assert.equal(normalizeMealType("DINNER"), "dinner");
  });
});
