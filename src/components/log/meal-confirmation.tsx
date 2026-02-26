"use client";

import type { ParsedMeal } from "@/lib/ai/types";

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-green-100", text: "text-green-800", label: "High Confidence" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Medium Confidence" },
  low: { bg: "bg-red-100", text: "text-red-800", label: "Low Confidence" },
};

const PRIMARY_NUTRIENTS: { key: string; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "calcium", label: "Calcium", unit: "mg" },
  { key: "vitaminD", label: "Vitamin D", unit: "IU" },
];

const SECONDARY_NUTRIENTS: { key: string; label: string; unit: string }[] = [
  { key: "iron", label: "Iron", unit: "mg" },
  { key: "zinc", label: "Zinc", unit: "mg" },
  { key: "magnesium", label: "Magnesium", unit: "mg" },
  { key: "potassium", label: "Potassium", unit: "mg" },
  { key: "vitaminA", label: "Vitamin A", unit: "mcg" },
  { key: "vitaminC", label: "Vitamin C", unit: "mg" },
  { key: "fiber", label: "Fiber", unit: "g" },
  { key: "omega3", label: "Omega-3", unit: "mg" },
];

interface MealConfirmationProps {
  parsedMeal: ParsedMeal;
  childName: string;
  onConfirm: () => void;
  onEdit: () => void;
  onBack: () => void;
}

export default function MealConfirmation({
  parsedMeal,
  childName,
  onConfirm,
  onBack,
}: MealConfirmationProps) {
  const { items, totalNutrition, confidence, assumptions } = parsedMeal;
  const style = CONFIDENCE_STYLES[confidence] ?? CONFIDENCE_STYLES.medium;

  return (
    <div className="space-y-6">
      {/* Header with confidence badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {childName}&apos;s Meal
        </h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${style.bg} ${style.text}`}
        >
          {style.label}
        </span>
      </div>

      {/* Parsed food items */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h4 className="mb-3 text-sm font-medium text-gray-500">Food Items</h4>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-baseline justify-between">
              <span className="font-medium text-gray-900">{item.name}</span>
              <span className="text-sm text-gray-500">
                {item.quantity} · {item.estimatedGrams}g
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Primary nutrition — prominent */}
      <div className="grid grid-cols-2 gap-3">
        {PRIMARY_NUTRIENTS.map(({ key, label, unit }) => (
          <div
            key={key}
            className="rounded-lg bg-gray-50 p-3 text-center"
          >
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(totalNutrition[key as keyof typeof totalNutrition])}
            </p>
            <p className="text-xs text-gray-500">
              {label} ({unit})
            </p>
          </div>
        ))}
      </div>

      {/* Secondary nutrition — compact */}
      <div className="rounded-lg border border-gray-100 p-4">
        <h4 className="mb-2 text-sm font-medium text-gray-500">
          Other Nutrients
        </h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {SECONDARY_NUTRIENTS.map(({ key, label, unit }) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-600">{label}</span>
              <span className="font-medium text-gray-900">
                {Math.round(totalNutrition[key as keyof typeof totalNutrition])}
                {unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Assumptions */}
      {assumptions.length > 0 && (
        <div className="rounded-lg bg-blue-50 p-4">
          <h4 className="mb-1 text-sm font-medium text-blue-800">
            Assumptions
          </h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-700">
            {assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Try Again
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Looks Right ✓
        </button>
      </div>
    </div>
  );
}