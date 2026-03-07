"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NutrientBar } from "./nutrient-bar";
import { MealStatus } from "./meal-status";

interface ChildCardProps {
  id: string;
  name: string;
  age: number;
  photoUrl: string | null;
  targets: Record<string, { target: number; unit: string }>;
  todayIntake: Record<string, { amount: number; unit: string }>;
  todayMeals: { mealType: string; logged: boolean; summary?: string }[];
  /** The currently selected date — passed from the dashboard page. */
  selectedDate: Date;
}

const PRIMARY_NUTRIENTS = [
  { key: "calories", label: "Calories", fallbackUnit: "kcal" },
  { key: "protein", label: "Protein", fallbackUnit: "g" },
  { key: "calcium", label: "Calcium", fallbackUnit: "mg" },
  { key: "vitaminD", label: "Vitamin D", fallbackUnit: "IU" },
];

export function ChildCard({
  id,
  name,
  age,
  photoUrl,
  targets,
  todayIntake,
  todayMeals,
  selectedDate,
}: ChildCardProps) {
  const initial = name.charAt(0).toUpperCase();

  const [suggestion, setSuggestion] = useState<string | null>(null);

  // Re-fetch suggestions whenever the child or selected date changes so the
  // tip reflects what has (or hasn't) been eaten that day.
  useEffect(() => {
    fetch(`/api/child/${id}/suggestions`)
      .then((res) => {
        if (!res.ok) return;
        return res.json();
      })
      .then((data: { suggestion: string | null } | undefined) => {
        if (data?.suggestion) {
          setSuggestion(data.suggestion);
        }
      })
      .catch(() => {
        // Silently skip on error — suggestions are non-critical
      });
  }, [id, selectedDate]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-3">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
              {initial}
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold text-gray-900">{name}</h2>
            <p className="text-sm text-gray-500">
              {age} year{age !== 1 ? "s" : ""} old
            </p>
          </div>
        </div>
        <Link
          href={`/log/${id}`}
          className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          + Log Meal
        </Link>
      </div>

      {/* Clickable area linking to child detail */}
      <Link href={`/child/${id}`} className="block px-5 pb-5 pt-4">
        {/* Nutrient Bars */}
        <div className="mb-4 space-y-2.5">
          {PRIMARY_NUTRIENTS.map(({ key, label, fallbackUnit }) => {
            const target = targets[key];
            const intake = todayIntake[key];
            return (
              <NutrientBar
                key={key}
                label={label}
                current={intake?.amount ?? 0}
                target={target?.target ?? 0}
                unit={target?.unit ?? intake?.unit ?? fallbackUnit}
              />
            );
          })}
        </div>

        {/* Meal Status */}
        <MealStatus meals={todayMeals} />

        {/* AI Suggestion — only shown when non-null; no skeleton to avoid layout flash */}
        {suggestion !== null && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span className="mt-0.5 shrink-0">💡</span>
            <span>{suggestion}</span>
          </div>
        )}
      </Link>
    </div>
  );
}
