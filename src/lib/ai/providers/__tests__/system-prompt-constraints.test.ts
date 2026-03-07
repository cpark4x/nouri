/**
 * TDD tests for ingredient constraint injection in system prompts (B8).
 * Spec skeleton from b8-ingredient-constraints.md.
 */
import { describe, it, expect } from "vitest";
import { buildNouriSystemPrompt } from "../../../ai/nouri-system-prompt";

describe("buildNouriSystemPrompt with ingredient constraints", () => {
  it("includes constraint ingredients in the prompt", () => {
    const prompt = buildNouriSystemPrompt({
      childName: "Mason",
      childAge: 12,
      ingredientConstraints: [
        { ingredient: "peanuts", severity: "allergy" },
        { ingredient: "dairy", severity: "intolerance" },
      ],
    });
    expect(prompt).toContain("peanuts");
    expect(prompt).toContain("dairy");
  });

  it("marks allergy-level constraints distinctly", () => {
    const prompt = buildNouriSystemPrompt({
      ingredientConstraints: [{ ingredient: "tree nuts", severity: "allergy" }],
    });
    // Allergy constraints should be clearly flagged
    expect(prompt.toLowerCase()).toMatch(/allergy|severe|strict/);
    expect(prompt).toContain("tree nuts");
  });

  it("produces valid prompt with no constraints", () => {
    const prompt = buildNouriSystemPrompt({
      childName: "Charlotte",
      ingredientConstraints: [],
    });
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("produces valid prompt with undefined constraints", () => {
    const prompt = buildNouriSystemPrompt({ childName: "Mason" });
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });
});
