"use client";

import { useRouter } from "next/navigation";
import FamilyMealInput from "@/components/log/family-meal-input";

export default function FamilyMealPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Back to dashboard"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Log Family Meal</h1>
      </div>

      <FamilyMealInput onComplete={() => router.push("/")} />
    </div>
  );
}