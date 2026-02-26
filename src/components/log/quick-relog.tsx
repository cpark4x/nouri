"use client";

import { useEffect, useState } from "react";

interface RecentMeal {
  description: string;
  mealType: string;
  lastLoggedAt: string;
  count: number;
  nutrients: { nutrient: string; amount: number; unit: string }[];
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export default function QuickRelog({
  childId,
  childName,
  onRelogged,
}: {
  childId: string;
  childName: string;
  onRelogged: () => void;
}) {
  const [meals, setMeals] = useState<RecentMeal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch(`/api/log/recent?childId=${childId}`);
        if (!res.ok) return;
        const data = await res.json();
        setMeals(data.meals ?? []);
      } catch {
        // Silent fail — quick re-log is a convenience feature
      } finally {
        setLoaded(true);
      }
    }
    fetchRecent();
  }, [childId]);

  async function handleRelog(meal: RecentMeal, index: number) {
    if (savingIndex !== null) return;
    setSavingIndex(index);

    try {
      // Reconstruct totalNutrition from stored nutrient entries
      const totalNutrition: Record<string, number> = {};
      for (const n of meal.nutrients) {
        totalNutrition[n.nutrient] = n.amount;
      }

      const parsedMeal = {
        items: [
          { name: meal.description, quantity: "1 serving", estimatedGrams: 0 },
        ],
        totalNutrition,
        confidence: "high" as const,
        assumptions: ["Re-logged from previous meal"],
      };

      const res = await fetch("/api/log/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          mealType: meal.mealType,
          description: meal.description,
          parsedMeal,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      onRelogged();
    } catch {
      setSavingIndex(null);
    }
  }

  // Don't render anything while loading or if no recent meals
  if (!loaded || meals.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-900">Quick re-log</h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Meals {childName} has had before
      </p>

      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {meals.map((meal, i) => (
          <button
            key={`${meal.description}-${meal.mealType}`}
            onClick={() => handleRelog(meal, i)}
            disabled={savingIndex !== null}
            className={`flex min-w-[160px] shrink-0 flex-col rounded-xl border p-3 text-left transition-colors ${
              savingIndex === i
                ? "border-teal-300 bg-teal-50"
                : savingIndex !== null
                  ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-50"
                  : "border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50"
            }`}
          >
            {savingIndex === i ? (
              <div className="flex h-full w-full items-center justify-center py-2">
                <svg className="h-5 w-5 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{MEAL_ICONS[meal.mealType] ?? "🍽️"}</span>
                  <span className="text-xs font-medium capitalize text-gray-500">
                    {meal.mealType}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm font-medium text-gray-900">
                  {meal.description}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <span>{timeAgo(meal.lastLoggedAt)}</span>
                  <span>·</span>
                  <span>
                    logged {meal.count} {meal.count === 1 ? "time" : "times"}
                  </span>
                </div>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}