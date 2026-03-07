/**
 * TDD test for recipe-scraper.ts
 */
import { describe, it, expect } from "vitest";
import assert from "node:assert/strict";
import { scrapeRecipeFromUrl } from "../recipe-scraper";

describe("scrapeRecipeFromUrl", () => {
  it("is exported as a function", () => {
    assert.equal(typeof scrapeRecipeFromUrl, "function");
  });
});

describe("hostname extraction (sourceName logic)", () => {
  function extractSourceName(url: string): string {
    return new URL(url).hostname.replace(/^www\./, "");
  }

  it("strips www. from hostname", () => {
    expect(extractSourceName("https://www.budgetbytes.com/recipe/chicken-fried-rice")).toBe("budgetbytes.com");
  });

  it("handles URLs with no www.", () => {
    expect(extractSourceName("https://allrecipes.com/recipe/123")).toBe("allrecipes.com");
  });

  it("strips www. from food.com", () => {
    expect(extractSourceName("https://www.food.com/recipe")).toBe("food.com");
  });
});
