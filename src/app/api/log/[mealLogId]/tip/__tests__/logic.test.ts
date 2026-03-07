/**
 * TDD tests for per-meal tip pure logic
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { calculateNutrientPercents, buildTipPrompt } from "../logic";

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
  // iron intentionally absent
];

describe("calculateNutrientPercents", () => {
  it("calculates correct percentages", () => {
    const percents = calculateNutrientPercents(nutrients, dailyTargets);
    // calories: 400 / 2000 * 100 = 20
    assert.equal(percents["calories"]?.percent, 20);
    assert.equal(percents["calories"]?.amount, 400);
    assert.equal(percents["calories"]?.unit, "kcal");
    // protein: 12 / 50 * 100 = 24
    assert.equal(percents["protein"]?.percent, 24);
    // calcium: 200 / 1000 * 100 = 20
    assert.equal(percents["calcium"]?.percent, 20);
  });

  it("returns null percent when no target exists for a nutrient", () => {
    const percents = calculateNutrientPercents(nutrients, dailyTargets);
    assert.equal(percents["iron"]?.percent, null);
    assert.equal(percents["iron"]?.amount, 3);
  });

  it("rounds percentages correctly", () => {
    const percents = calculateNutrientPercents(
      [{ nutrient: "calories", amount: 1005, unit: "kcal" }],
      [{ nutrient: "calories", target: 3000, unit: "kcal" }],
    );
    // 1005/3000 * 100 = 33.5 → rounds to 34
    assert.equal(percents["calories"]?.percent, 34);
  });
});

describe("buildTipPrompt", () => {
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

  it("starts with 'You are Nouri.'", () => {
    assert.ok(prompt.startsWith("You are Nouri."));
  });

  it("includes child name, age, and activity", () => {
    assert.ok(prompt.includes("Mia"));
    assert.ok(prompt.includes("7"));
    assert.ok(prompt.includes("soccer"));
  });

  it("includes the meal description", () => {
    assert.ok(prompt.includes("peanut butter sandwich and apple"));
  });

  it("includes nutrient lines", () => {
    assert.ok(prompt.includes(nutrientLines));
  });

  it("includes 20-word limit constraint", () => {
    assert.ok(prompt.includes("20 words"));
  });

  it("references the child's name for use in the tip", () => {
    assert.ok(prompt.toLowerCase().includes("mia"));
  });
});
