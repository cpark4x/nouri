/**
 * TDD tests for daily goal gap suggestion pure logic
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  aggregateTodayIntake,
  computeGaps,
  isOnTrack,
  buildSuggestionPrompt,
} from "../logic";

const mockMealLogs = [
  {
    nutrients: [
      { nutrient: "calories", amount: 400, unit: "kcal" },
      { nutrient: "protein", amount: 15, unit: "g" },
    ],
  },
  {
    nutrients: [
      { nutrient: "calories", amount: 200, unit: "kcal" },
      { nutrient: "calcium", amount: 300, unit: "mg" },
    ],
  },
];

const targets = [
  { nutrient: "calories", target: 1200, unit: "kcal" },
  { nutrient: "protein", target: 50, unit: "g" },
  { nutrient: "calcium", target: 800, unit: "mg" },
  { nutrient: "vitaminD", target: 0, unit: "IU" },
];

describe("aggregateTodayIntake", () => {
  it("sums nutrients correctly across multiple meals", () => {
    const intakeMap = aggregateTodayIntake(mockMealLogs);
    assert.equal(intakeMap["calories"], 600);
    assert.equal(intakeMap["protein"], 15);
    assert.equal(intakeMap["calcium"], 300);
    assert.equal(intakeMap["iron"], undefined);
  });

  it("returns empty map for empty logs", () => {
    const emptyIntake = aggregateTodayIntake([]);
    assert.deepEqual(emptyIntake, {});
  });
});

describe("computeGaps", () => {
  const intake = { calories: 600, protein: 40, calcium: 0 };

  it("returns sorted gaps descending and excludes zero-target nutrients", () => {
    const gaps = computeGaps(targets, intake);
    // vitaminD has target=0 → excluded
    assert.equal(gaps.length, 3);
    // calcium: 100% remaining → first
    assert.equal(gaps[0].nutrient, "calcium");
    assert.equal(gaps[0].remaining, 800);
    assert.equal(gaps[0].percentRemaining, 1);
    assert.equal(gaps[0].unit, "mg");
    // calories: 50% remaining → second
    assert.equal(gaps[1].nutrient, "calories");
    assert.equal(gaps[1].remaining, 600);
    assert.ok(Math.abs(gaps[1].percentRemaining - 0.5) < 0.001);
    // protein: 20% remaining → third
    assert.equal(gaps[2].nutrient, "protein");
    assert.equal(gaps[2].remaining, 10);
    assert.ok(Math.abs(gaps[2].percentRemaining - 0.2) < 0.001);
  });
});

describe("isOnTrack", () => {
  it("returns true when < 30% remaining", () => {
    // (1200-900)/1200 = 0.25 < 0.30 → on track
    assert.equal(isOnTrack(1200, 900), true);
  });

  it("returns false when >= 30% remaining", () => {
    // (1200-600)/1200 = 0.50 → not on track
    assert.equal(isOnTrack(1200, 600), false);
    // exactly 30% → still not on track (strict < threshold)
    assert.equal(isOnTrack(1200, 840), false);
  });

  it("returns true when target is zero", () => {
    assert.equal(isOnTrack(0, 0), true);
  });
});

describe("buildSuggestionPrompt", () => {
  const gap1 = { nutrient: "calcium", remaining: 800, unit: "mg", target: 800, intake: 0, percentRemaining: 1 };
  const gap2 = { nutrient: "protein", remaining: 10, unit: "g", target: 50, intake: 40, percentRemaining: 0.2 };
  const prompt = buildSuggestionPrompt("Emma", 8, [gap1, gap2], 400, 1200);

  it("starts with the child's name and age context", () => {
    assert.ok(prompt.startsWith("Emma (8yo)"));
  });

  it("includes child name and age", () => {
    assert.ok(prompt.includes("Emma"));
    assert.ok(prompt.includes("8"));
  });

  it("includes gap nutrient details", () => {
    assert.ok(prompt.includes("calcium"));
    assert.ok(prompt.includes("800"));
    assert.ok(prompt.includes("mg"));
    assert.ok(prompt.includes("protein"));
  });

  it("includes calorie context", () => {
    assert.ok(prompt.includes("400"));
    assert.ok(prompt.includes("1200"));
  });

  it("includes 25-word limit constraint", () => {
    assert.ok(prompt.includes("25 words"));
  });

  it("references child name for use in suggestion", () => {
    assert.ok(prompt.toLowerCase().includes("emma"));
  });
});
