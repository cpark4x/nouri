"use client";

import { useState, useEffect, useRef } from "react";

interface MealNutrient {
  nutrient: string;
  amount: number;
  unit: string;
}

interface Meal {
  id: string;
  mealType: string;
  description: string;
  createdAt: string;
  confidence: string;
  nutrients: MealNutrient[];
}

interface MealListProps {
  meals: Meal[];
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

const NUTRIENT_LABELS: Record<string, string> = {
  calories: "Calories",
  protein: "Protein",
  calcium: "Calcium",
  vitaminD: "Vitamin D",
  iron: "Iron",
  zinc: "Zinc",
  magnesium: "Magnesium",
  potassium: "Potassium",
  vitaminA: "Vitamin A",
  vitaminC: "Vitamin C",
  fiber: "Fiber",
  omega3: "Omega-3",
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-rose-100 text-rose-700",
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function MealItem({
  meal: initialMeal,
  onUpdate,
}: {
  meal: Meal;
  onUpdate?: (updatedMeal: Meal) => void;
}) {
  const [meal, setMeal] = useState(initialMeal);
  const [expanded, setExpanded] = useState(false);
  const [tipText, setTipText] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(false);
  const [tipFetched, setTipFetched] = useState(false);
  const [tipError, setTipError] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Holds the AbortController for any in-flight tip request so we can cancel
  // it if the user saves an edit before the tip resolves (race-condition guard).
  const abortTipRef = useRef<AbortController | null>(null);

  const label = MEAL_LABELS[meal.mealType] ?? meal.mealType;
  const confidenceClass =
    CONFIDENCE_STYLES[meal.confidence] ?? CONFIDENCE_STYLES.medium;

  useEffect(() => {
    if (!expanded || tipFetched) return;
    const controller = new AbortController();
    abortTipRef.current = controller;
    setTipLoading(true);
    setTipFetched(true);
    setTipError(false);
    fetch(`/api/log/${meal.id}/tip`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("tip fetch failed");
        return res.json() as Promise<{ tip: string }>;
      })
      .then((data) => {
        setTipText(data.tip);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setTipError(true);
      })
      .finally(() => {
        setTipLoading(false);
      });
    return () => controller.abort();
  }, [expanded, tipFetched, meal.id]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/log/${meal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editText }),
      });
      if (!res.ok) {
        // Surface the server's error message (e.g. AI failure) when available
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to save. Please try again.");
      }
      const updatedMeal = (await res.json()) as Meal;
      setMeal(updatedMeal);
      onUpdate?.(updatedMeal);
      // Cancel any in-flight tip fetch so a stale tip from the old description
      // cannot overwrite state after the save completes (race-condition guard).
      abortTipRef.current?.abort();
      // Reset tip so it re-fetches against the updated meal on next expand
      setTipText(null);
      setTipFetched(false);
      setEditing(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              {label}
            </span>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${confidenceClass}`}
            >
              {meal.confidence}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-gray-600">
            {meal.description}
          </p>
        </div>
        <span className="ml-3 shrink-0 text-xs text-gray-400">
          {formatTime(meal.createdAt)}
        </span>
      </button>

      {expanded && meal.nutrients.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {meal.nutrients.map((n) => (
              <div
                key={n.nutrient}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-500">
                  {NUTRIENT_LABELS[n.nutrient] ?? n.nutrient}
                </span>
                <span className="tabular-nums text-gray-700">
                  {Math.round(n.amount)} {n.unit}
                </span>
              </div>
            ))}
          </div>

          {/* ── Edit UI ──────────────────────────────────────────────────── */}
          {!editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setEditText(meal.description);
                }}
                className="mt-1 text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Edit meal
              </button>
            </>
          ) : (
            <div className="mt-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full rounded-lg border border-gray-200 p-2 text-sm resize-none"
                rows={3}
              />
              {saveError && (
                <p className="mt-1 text-xs text-red-500">{saveError}</p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !editText.trim()}
                  className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-md disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setSaveError(null);
                  }}
                  disabled={saving}
                  className="text-xs text-gray-500 px-3 py-1 rounded-md border"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Tip UI ───────────────────────────────────────────────────── */}
          {tipLoading && (
            <div className="mt-3 h-8 animate-pulse rounded-lg bg-green-100" />
          )}
          {!tipLoading && tipText !== null && (
            <div className="mt-3 rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-sm text-green-800">
              ✨ {tipText}
            </div>
          )}
          {!tipLoading && tipError && (
            <p className="mt-3 text-xs text-gray-400">
              Tip unavailable — try again later
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function MealList({ meals: initialMeals }: MealListProps) {
  const [meals, setMeals] = useState(initialMeals);

  if (meals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">
        No meals logged today
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {meals.map((meal) => (
        <MealItem
          key={meal.id}
          meal={meal}
          onUpdate={(updated) =>
            setMeals((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
          }
        />
      ))}
    </div>
  );
}
