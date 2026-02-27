import { describe, it, expect } from "vitest";
import { inferMealType, MEAL_TYPE_LABELS } from "../meal-type-inference";

describe("inferMealType", () => {
  it("returns 'breakfast' before 10am", () => {
    expect(inferMealType(new Date("2024-01-01T06:00:00"))).toBe("breakfast");
    expect(inferMealType(new Date("2024-01-01T09:59:00"))).toBe("breakfast");
  });

  it("returns 'lunch' from 10am to before 2pm", () => {
    expect(inferMealType(new Date("2024-01-01T10:00:00"))).toBe("lunch");
    expect(inferMealType(new Date("2024-01-01T13:59:00"))).toBe("lunch");
  });

  it("returns 'snack' from 2pm to before 5pm", () => {
    expect(inferMealType(new Date("2024-01-01T14:00:00"))).toBe("snack");
    expect(inferMealType(new Date("2024-01-01T16:59:00"))).toBe("snack");
  });

  it("returns 'dinner' from 5pm onwards", () => {
    expect(inferMealType(new Date("2024-01-01T17:00:00"))).toBe("dinner");
    expect(inferMealType(new Date("2024-01-01T23:00:00"))).toBe("dinner");
  });

  it("defaults to current time when no argument passed", () => {
    const result = inferMealType();
    expect(["breakfast", "lunch", "snack", "dinner"]).toContain(result);
  });
});

describe("MEAL_TYPE_LABELS", () => {
  it("has labels for all four meal types", () => {
    expect(MEAL_TYPE_LABELS.breakfast).toBe("Breakfast");
    expect(MEAL_TYPE_LABELS.lunch).toBe("Lunch");
    expect(MEAL_TYPE_LABELS.snack).toBe("Snack");
    expect(MEAL_TYPE_LABELS.dinner).toBe("Dinner");
  });
});
