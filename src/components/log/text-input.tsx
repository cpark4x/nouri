"use client";

import { useState } from "react";
import type { ParsedMeal } from "@/lib/ai/types";

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

interface TextInputProps {
  childName: string;
  onParsed: (parsed: ParsedMeal, description: string, mealType: string) => void;
}

export default function TextInput({ childName, onParsed }: TextInputProps) {
  const [mealType, setMealType] = useState(getDefaultMealType);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      // childId is in the URL — extract from pathname
      const pathParts = window.location.pathname.split("/");
      const childId = pathParts[pathParts.length - 1];

      const res = await fetch("/api/log/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, description: description.trim(), mealType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to analyze meal");
      }

      const parsed: ParsedMeal = await res.json();
      onParsed(parsed, description.trim(), mealType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        placeholder={`What did ${childName} eat?`}
        rows={4}
        className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-base placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
      />

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

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
            Analyzing…
          </span>
        ) : (
          "Analyze Meal"
        )}
      </button>
    </form>
  );
}