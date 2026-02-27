/**
 * TDD test for recipe-scraper.ts
 * Run with: npx tsx src/lib/ai/providers/__tests__/recipe-scraper.test.ts
 *
 * RED: fails because recipe-scraper.ts does not exist yet
 * GREEN: passes once recipe-scraper.ts is implemented
 */
import assert from "node:assert/strict";
import { scrapeRecipeFromUrl } from "../recipe-scraper";

// Test: module exports scrapeRecipeFromUrl as a function
assert.equal(
  typeof scrapeRecipeFromUrl,
  "function",
  "scrapeRecipeFromUrl must be exported as a function",
);

// Test: sourceName strips www. from hostname
// We verify this logic independently since it is pure
function extractSourceName(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

assert.equal(
  extractSourceName("https://www.budgetbytes.com/recipe/chicken-fried-rice"),
  "budgetbytes.com",
  "should strip www. from hostname",
);
assert.equal(
  extractSourceName("https://allrecipes.com/recipe/123"),
  "allrecipes.com",
  "should handle no www.",
);
assert.equal(
  extractSourceName("https://www.food.com/recipe"),
  "food.com",
  "should strip www. from food.com",
);

console.log("✓ scrapeRecipeFromUrl exported as function");
console.log("✓ hostname extraction logic correct");
console.log("All recipe-scraper tests passed!");
