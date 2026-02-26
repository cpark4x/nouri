"use client";

import { useState } from "react";
import type { ParsedMeal, NutritionEstimate } from "@/lib/ai/types";

const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

function getDefaultMealType(): string {
  const hour = new Date().getHours();
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snack";
  return "dinner";
}

interface ChildResult {
  childId: string;
  childName: string;
  parsedMeal: ParsedMeal;
}

const CONFIDENCE_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  high: { bg: "bg-green-100", text: "text-green-800", label: "High" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Medium" },
  low: { bg: "bg-red-100", text: "text-red-800", label: "Low" },
};

const PRIMARY_NUTRIENTS: { key: keyof NutritionEstimate; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "calcium", label: "Calcium", unit: "mg" },
  { key: "vitaminD", label: "Vitamin D", unit: "IU" },
];

interface FamilyMealInputProps {
  onComplete: () => void;
}

export default function FamilyMealInput({ onComplete }: FamilyMealInputProps) {
  const [mealType, setMealType] = useState(getDefaultMealType);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After parsing
  const [results, setResults] = useState<ChildResult[] | null>(null);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/log/parse-family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          mealType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to analyze meal");
      }

      const data = await res.json();
      setResults(data.children);
      // Default all children to confirmed
      const defaultConfirmed: Record<string, boolean> = {};
      for (const child of data.children) {
        defaultConfirmed[child.childId] = true;
      }
      setConfirmed(defaultConfirmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function toggleChild(childId: string) {
    setConfirmed((prev) => ({ ...prev, [childId]: !prev[childId] }));
  }

  async function handleSave() {
    if (!results || saving) return;

    const toSave = results.filter((r) => confirmed[r.childId]);
    if (toSave.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      // Save each confirmed child's meal individually
      await Promise.all(
        toSave.map((child) =>
          fetch("/api/log/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              childId: child.childId,
              mealType,
              description: description.trim(),
              parsedMeal: child.parsedMeal,
            }),
          }).then((res) => {
            if (!res.ok) throw new Error(`Failed to save for ${child.childName}`);
          }),
        ),
      );

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save meals");
      setSaving(false);
    }
  }

  function handleBack() {
    setResults(null);
    setConfirmed({});
    setError(null);
  }

  const confirmedCount = results
    ? results.filter((r) => confirmed[r.childId]).length
    : 0;

  // --- Input state ---
  if (!results) {
    return (
      <form onSubmit={handleAnalyze} className="space-y-6">
        {/* Meal type selector */}
        <div className="flex gap-2">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMealType(type)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mealType === type
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {MEAL_LABELS[type]}
            </button>
          ))}
        </div>

        {/* Text input */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did the kids eat?"
          rows={4}
          className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-base placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
        />

        {/* Error message */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Submit button */}
        <button
          type="submit"
          disabled={!description.trim() || loading}
          className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing for all kids…
            </span>
          ) : (
            "Analyze Meal"
          )}
        </button>
      </form>
    );
  }

  // --- Confirmation state ---
  return (
    <div className="space-y-6">
      {/* Confirmation cards — side by side on desktop, stacked on mobile */}
      <div className="grid gap-5 md:grid-cols-2">
        {results.map((child) => {
          const { parsedMeal } = child;
          const { items, totalNutrition, confidence, assumptions } = parsedMeal;
          const style = CONFIDENCE_STYLES[confidence] ?? CONFIDENCE_STYLES.medium;
          const isConfirmed = confirmed[child.childId];

          return (
            <div
              key={child.childId}
              className={`rounded-xl border bg-white p-5 shadow-sm transition-opacity ${
                isConfirmed ? "border-gray-200" : "border-gray-100 opacity-50"
              }`}
            >
              {/* Header with name, confidence, toggle */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {child.childName}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                  >
                    {style.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleChild(child.childId)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    isConfirmed
                      ? "bg-gray-900 text-white hover:bg-gray-800"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {isConfirmed ? "Included ✓" : "Skipped"}
                </button>
              </div>

              {/* Food items */}
              <div className="mb-4 rounded-lg border border-gray-200 p-3">
                <ul className="space-y-1.5">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <span className="text-gray-500">
                        {item.quantity} · {item.estimatedGrams}g
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Primary nutrients — compact grid */}
              <div className="mb-3 grid grid-cols-2 gap-2">
                {PRIMARY_NUTRIENTS.map(({ key, label, unit }) => (
                  <div key={key} className="rounded-lg bg-gray-50 p-2 text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {Math.round(totalNutrition[key])}
                    </p>
                    <p className="text-xs text-gray-500">
                      {label} ({unit})
                    </p>
                  </div>
                ))}
              </div>

              {/* Assumptions */}
              {assumptions.length > 0 && (
                <div className="rounded-lg bg-blue-50 p-3">
                  <ul className="list-inside list-disc space-y-0.5 text-xs text-blue-700">
                    {assumptions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex-1 rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Try Again
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={confirmedCount === 0 || saving}
          className="flex-1 rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving…
            </span>
          ) : (
            `Save ${confirmedCount} ${confirmedCount === 1 ? "Meal" : "Meals"} ✓`
          )}
        </button>
      </div>
    </div>
  );
}