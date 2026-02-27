"use client";

import {
  NUTRIENT_GOOD_THRESHOLD,
  NUTRIENT_WARN_THRESHOLD,
} from "./nutrient-thresholds";

const PRIMARY_NUTRIENTS = [
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein" },
  { key: "calcium", label: "Calcium" },
  { key: "vitaminD", label: "Vitamin D" },
  { key: "iron", label: "Iron" },
  { key: "zinc", label: "Zinc" },
] as const;

interface WeeklySummaryProps {
  weeklyAveragePercent: Record<string, number>;
  childName: string;
}

function getTileColorClass(percent: number): string {
  if (percent >= NUTRIENT_GOOD_THRESHOLD) return "text-green-500";
  if (percent >= NUTRIENT_WARN_THRESHOLD) return "text-yellow-500";
  return "text-red-500";
}

export function WeeklySummary({
  weeklyAveragePercent,
  childName,
}: WeeklySummaryProps) {
  return (
    <div className="mb-6">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">
        7-Day Averages for {childName}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PRIMARY_NUTRIENTS.map(({ key, label }) => {
          const percent = weeklyAveragePercent[key] ?? 0;
          return (
            <div
              key={key}
              className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-sm"
            >
              <p className="text-xs font-medium text-gray-600">{label}</p>
              <p
                className={`text-2xl font-bold tabular-nums ${getTileColorClass(percent)}`}
              >
                {Math.round(percent)}%
              </p>
              <p className="text-xs text-gray-400">7-day avg</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
