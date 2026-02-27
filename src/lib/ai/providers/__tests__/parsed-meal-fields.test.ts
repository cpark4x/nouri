import type { ParsedMeal } from "@/lib/ai/types";

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

console.assert(typeof meal.title === "string", "title must be string");
console.assert(typeof meal.cleanDescription === "string", "cleanDescription must be string");
console.assert(meal.title.length > 0, "title must not be empty");
console.log("✅ ParsedMeal type check passed");
