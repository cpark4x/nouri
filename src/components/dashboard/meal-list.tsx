"use client";

import { useState, useEffect } from "react";

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

function MealItem({ meal }: { meal: Meal }) {
  const [expanded, setExpanded] = useState(false);
  const [tipText, setTipText] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(false);
  const [tipFetched, setTipFetched] = useState(false);
  const [tipError, setTipError] = useState(false);

  const label = MEAL_LABELS[meal.mealType] ?? meal.mealType;
  const confidenceClass =
    CONFIDENCE_STYLES[meal.confidence] ?? CONFIDENCE_STYLES.medium;

  useEffect(() => {
    if (!expanded || tipFetched) return;
    setTipLoading(true);
    setTipFetched(true);
    setTipError(false);
    fetch(`/api/log/${meal.id}/tip`)
      .then((res) => {
        if (!res.ok) throw new Error("tip fetch failed");
        return res.json() as Promise<{ tip: string }>;
      })
      .then((data) => {
        setTipText(data.tip);
      })
      .catch(() => {
        setTipError(true);
      })
      .finally(() => {
        setTipLoading(false);
      });
  }, [expanded, tipFetched, meal.id]);

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

export function MealList({ meals }: MealListProps) {
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
        <MealItem key={meal.id} meal={meal} />
      ))}
    </div>
  );
}