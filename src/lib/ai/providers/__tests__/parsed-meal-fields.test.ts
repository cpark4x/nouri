import { describe, it, expect } from "vitest";
import type { ParsedMeal } from "@/lib/ai/types";

describe("ParsedMeal type fields", () => {
  it("has required title and cleanDescription fields with correct types", () => {
    const meal: ParsedMeal = {
      items: [],
      totalNutrition: {
        calories: 0, protein: 0, calcium: 0, vitaminD: 0,
        iron: 0, zinc: 0, magnesium: 0, potassium: 0,
        vitaminA: 0, vitaminC: 0, fiber: 0, omega3: 0,
      },
      confidence: "high",
      assumptions: [],
      title: "Scrambled Eggs & Toast",
      cleanDescription: "Two scrambled eggs with buttered whole wheat toast.",
    };

    expect(typeof meal.title).toBe("string");
    expect(typeof meal.cleanDescription).toBe("string");
    expect(meal.title.length).toBeGreaterThan(0);
    expect(meal.cleanDescription.length).toBeGreaterThan(0);
  });
});
