"use client";

import { useState } from "react";
import { NutrientBar } from "./nutrient-bar";

interface NutrientDetailProps {
  targets: Record<string, { target: number; unit: string }>;
  todayIntake: Record<string, { amount: number; unit: string }>;
}

const PRIMARY_NUTRIENTS = [
  { key: "calories", label: "Calories", fallbackUnit: "kcal" },
  { key: "protein", label: "Protein", fallbackUnit: "g" },
  { key: "calcium", label: "Calcium", fallbackUnit: "mg" },
  { key: "vitaminD", label: "Vitamin D", fallbackUnit: "IU" },
];

const SECONDARY_NUTRIENTS = [
  { key: "iron", label: "Iron", fallbackUnit: "mg" },
  { key: "zinc", label: "Zinc", fallbackUnit: "mg" },
  { key: "magnesium", label: "Magnesium", fallbackUnit: "mg" },
  { key: "potassium", label: "Potassium", fallbackUnit: "mg" },
  { key: "vitaminA", label: "Vitamin A", fallbackUnit: "mcg" },
  { key: "vitaminC", label: "Vitamin C", fallbackUnit: "mg" },
  { key: "fiber", label: "Fiber", fallbackUnit: "g" },
  { key: "omega3", label: "Omega-3", fallbackUnit: "mg" },
];

function renderNutrients(
  nutrients: { key: string; label: string; fallbackUnit: string }[],
  targets: NutrientDetailProps["targets"],
  todayIntake: NutrientDetailProps["todayIntake"]
) {
  return nutrients.map(({ key, label, fallbackUnit }) => {
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
  });
}

export function NutrientDetail({ targets, todayIntake }: NutrientDetailProps) {
  const [showAll, setShowAll] = useState(false);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        Daily Nutrition
      </h3>
      <div className="space-y-2.5">
        {renderNutrients(PRIMARY_NUTRIENTS, targets, todayIntake)}
      </div>

      {showAll && (
        <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-4">
          {renderNutrients(SECONDARY_NUTRIENTS, targets, todayIntake)}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAll((prev) => !prev)}
        className="mt-3 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        {showAll ? "Show less" : "Show all nutrients"}
      </button>
    </div>
  );
}