/**
 * TDD tests for [mealLogId] route pure logic
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { buildNutritionEntries, validateDescription } from "../logic";

describe("validateDescription", () => {
  it("returns null for a valid string", () => {
    assert.equal(validateDescription("grilled chicken and rice"), null);
  });

  it("rejects empty string", () => {
    assert.ok(validateDescription("") !== null);
  });

  it("rejects whitespace-only string", () => {
    assert.ok(validateDescription("   ") !== null);
  });

  it("rejects null", () => {
    assert.ok(validateDescription(null) !== null);
  });

  it("rejects undefined", () => {
    assert.ok(validateDescription(undefined) !== null);
  });

  it("rejects non-string values", () => {
    assert.ok(validateDescription(42) !== null);
  });
});

describe("buildNutritionEntries", () => {
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
    omega3: 0,
  };

  it("filters out zero-amount nutrients", () => {
    const entries = buildNutritionEntries(fullNutrition);
    assert.ok(!entries.some((e) => e.amount === 0));
  });

  it("excludes omega3 when zero", () => {
    const entries = buildNutritionEntries(fullNutrition);
    assert.ok(!entries.some((e) => e.nutrient === "omega3"));
  });

  it("includes calories with correct amount", () => {
    const entries = buildNutritionEntries(fullNutrition);
    assert.ok(entries.some((e) => e.nutrient === "calories" && e.amount === 400));
  });

  it("uses correct units", () => {
    const entries = buildNutritionEntries(fullNutrition);
    const calorieEntry = entries.find((e) => e.nutrient === "calories");
    assert.equal(calorieEntry?.unit, "kcal");

    const proteinEntry = entries.find((e) => e.nutrient === "protein");
    assert.equal(proteinEntry?.unit, "g");

    const ironEntry = entries.find((e) => e.nutrient === "iron");
    assert.equal(ironEntry?.unit, "mg");
  });

  it("returns empty array for all-zero nutrition", () => {
    const zeroNutrition = {
      calories: 0, protein: 0, calcium: 0, vitaminD: 0,
      iron: 0, zinc: 0, magnesium: 0, potassium: 0,
      vitaminA: 0, vitaminC: 0, fiber: 0, omega3: 0,
    };
    const entries = buildNutritionEntries(zeroNutrition);
    assert.equal(entries.length, 0);
  });
});
