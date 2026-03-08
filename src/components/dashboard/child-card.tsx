"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NutrientBar } from "./nutrient-bar";
import { MealStatus } from "./meal-status";

export interface ChildCardChild {
  id: string;
  name: string;
  /** Used for the avatar initial and display. */
  age?: number;
  photoUrl?: string | null;
  /** Total gamification points accumulated by this child (C6). */
  points: number;
  /** Consecutive days ending today with ≥1 meal logged. 0 = no streak. */
  streak: number;
  /** Today's calorie intake in kcal. */
  todayCalories: number;
  /** Daily calorie target in kcal. */
  todayCaloriesTarget: number;
  /** Full nutrient targets — optional; shown when provided. */
  targets?: Record<string, { target: number; unit: string }>;
  /** Full nutrient intake for the viewed date — optional; shown when provided. */
  todayIntake?: Record<string, { amount: number; unit: string }>;
  /** Meal slot statuses for the viewed date — optional; shown when provided. */
  todayMeals?: { mealType: string; logged: boolean; summary?: string }[];
  /** The currently selected date — passed from the dashboard page. */
  selectedDate?: Date;
}

interface ChildCardProps {
  child: ChildCardChild;
}

const DETAIL_NUTRIENTS = [
  { key: "protein", label: "Protein", fallbackUnit: "g" },
  { key: "calcium", label: "Calcium", fallbackUnit: "mg" },
  { key: "vitaminD", label: "Vitamin D", fallbackUnit: "IU" },
];

export function ChildCard({ child }: ChildCardProps) {
  const {
    id,
    name,
    age,
    photoUrl,
    points,
    streak,
    todayCalories,
    todayCaloriesTarget,
    targets,
    todayIntake,
    todayMeals,
    selectedDate,
  } = child;

  const initial = name.charAt(0).toUpperCase();

  // Calories progress bar
  const caloriesPct =
    todayCaloriesTarget > 0
      ? Math.min((todayCalories / todayCaloriesTarget) * 100, 100)
      : 0;

  let caloriesBarColor: string;
  if (caloriesPct >= 80) {
    caloriesBarColor = "bg-emerald-500";
  } else if (caloriesPct >= 40) {
    caloriesBarColor = "bg-amber-500";
  } else {
    caloriesBarColor = "bg-rose-400";
  }

  const [suggestion, setSuggestion] = useState<string | null>(null);

  // Re-fetch suggestions whenever the child or selected date changes
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
      {/* ── Card Header: avatar + name, streak + points ── */}
      <div className="flex items-start justify-between px-5 pt-5">
        {/* Left: avatar + name */}
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
            <h2 className="text-lg font-bold text-gray-900">{name}</h2>
            {age !== undefined && (
              <p className="text-sm text-gray-500">
                {age} year{age !== 1 ? "s" : ""} old
              </p>
            )}
          </div>
        </div>

        {/* Right: streak + points badges */}
        <div className="flex flex-col items-end gap-1">
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-sm font-semibold text-orange-600">
              🔥 {streak}-day
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-0.5 text-sm font-semibold text-yellow-700">
            ⭐ {points} pts
          </span>
        </div>
      </div>

      {/* ── Calories progress bar (compact, always visible) ── */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500">Calories today</span>
          <span className="text-xs tabular-nums text-gray-500">
            {Math.round(todayCalories)}/{Math.round(todayCaloriesTarget)} kcal
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${caloriesBarColor}`}
            style={{ width: `${caloriesPct}%` }}
          />
        </div>
      </div>

      {/* ── Clickable body: links to child nutrition detail ── */}
      <Link href={`/child/${id}`} className="block px-5 pt-4 pb-3">
        {/* Detailed nutrient bars — shown only when full data is available */}
        {targets && todayIntake && (
          <div className="mb-4 space-y-2.5">
            {DETAIL_NUTRIENTS.map(({ key, label, fallbackUnit }) => {
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
        )}

        {/* Meal status — shown when meal data is available */}
        {todayMeals && <MealStatus meals={todayMeals} />}

        {/* AI suggestion — only shown when non-null */}
        {suggestion !== null && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span className="mt-0.5 shrink-0">💡</span>
            <span>{suggestion}</span>
          </div>
        )}
      </Link>

      {/* ── Log a Meal CTA ── */}
      <div className="px-5 pb-5">
        <Link
          href={`/log/${id}`}
          role="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 active:bg-gray-700"
        >
          Log a Meal →
        </Link>
      </div>
    </div>
  );
}
