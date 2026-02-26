"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { NutrientDetail } from "@/components/dashboard/nutrient-detail";
import { MealList } from "@/components/dashboard/meal-list";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { WeeklySummary } from "@/components/dashboard/weekly-summary";
import type { DayData } from "@/components/dashboard/weekly-chart";

interface ChildDetail {
  id: string;
  name: string;
  age: number;
  photoUrl: string | null;
  gender: string;
  heightCm: number | null;
  weightKg: number | null;
  activityProfile: { sports?: { name: string; frequency?: string; intensity?: string }[] } | null;
  goals: string | null;
  targets: Record<string, { target: number; unit: string }>;
  todayIntake: Record<string, { amount: number; unit: string }>;
  todayMeals: {
    id: string;
    mealType: string;
    description: string;
    createdAt: string;
    confidence: string;
    nutrients: { nutrient: string; amount: number; unit: string }[];
  }[];
}

interface WeeklyData {
  child: {
    id: string;
    name: string;
    targets: Record<string, { target: number; unit: string }>;
  };
  days: DayData[];
  weeklyAverages: Record<string, number>;
  weeklyAveragePercent: Record<string, number>;
}

const MORE_NUTRIENTS: { key: string; label: string }[] = [
  { key: "protein", label: "Protein" },
  { key: "calcium", label: "Calcium" },
  { key: "vitaminD", label: "Vitamin D" },
];

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Back button skeleton */}
      <div className="mb-6 h-5 w-32 rounded bg-gray-200" />

      {/* Profile header skeleton */}
      <div className="mb-8 flex items-start gap-4">
        <div className="h-16 w-16 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-36 rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-48 rounded bg-gray-200" />
        </div>
      </div>

      {/* Nutrient bars skeleton */}
      <div className="mb-8 space-y-3">
        <div className="h-4 w-28 rounded bg-gray-200" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="h-2.5 flex-1 rounded-full bg-gray-100" />
            <div className="h-3 w-24 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Meals skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-gray-200" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg border border-gray-200 bg-gray-50" />
        ))}
      </div>
    </div>
  );
}

function WeeklyLoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
    </div>
  );
}

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [child, setChild] = useState<ChildDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"today" | "thisWeek">("today");

  // Weekly data state
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [weeklyFetched, setWeeklyFetched] = useState(false);

  // Collapsible more-nutrients section
  const [showMoreCharts, setShowMoreCharts] = useState(false);

  // Fetch today's data
  useEffect(() => {
    async function fetchChild() {
      try {
        const res = await fetch(`/api/child/${id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Failed to load child data");
          return;
        }
        const data = await res.json();
        setChild(data);
      } catch {
        setError("Failed to load child data");
      } finally {
        setLoading(false);
      }
    }
    fetchChild();
  }, [id]);

  // Lazy-fetch weekly data when the "This Week" tab is first activated
  useEffect(() => {
    if (activeTab !== "thisWeek" || weeklyFetched) return;

    async function fetchWeekly() {
      setWeeklyLoading(true);
      try {
        const res = await fetch(`/api/child/${id}/weekly`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setWeeklyError(data.error ?? "Failed to load weekly data");
          return;
        }
        const data = await res.json();
        setWeeklyData(data);
      } catch {
        setWeeklyError("Failed to load weekly data");
      } finally {
        setWeeklyLoading(false);
        setWeeklyFetched(true);
      }
    }
    fetchWeekly();
  }, [activeTab, id, weeklyFetched]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          &larr; Back to Dashboard
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-600">
          {error ?? "Child not found"}
        </div>
      </div>
    );
  }

  const initial = child.name.charAt(0).toUpperCase();

  // Extract sports list from activityProfile
  const sports =
    child.activityProfile &&
    typeof child.activityProfile === "object" &&
    "sports" in child.activityProfile &&
    Array.isArray(child.activityProfile.sports)
      ? child.activityProfile.sports
      : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          &larr; Back to Dashboard
        </Link>
        <Link
          href={`/child/${child.id}/edit`}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Edit
        </Link>
      </div>

      {/* Profile Header */}
      <div className="mb-6 flex items-start gap-4">
        {child.photoUrl ? (
          <img
            src={child.photoUrl}
            alt={child.name}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-900 text-xl font-semibold text-white">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-gray-900">{child.name}</h1>
          <p className="text-sm text-gray-500">
            {child.age} year{child.age !== 1 ? "s" : ""} old
          </p>

          {sports.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {sports.map((s) => s.name).join(", ")}
            </p>
          )}

          {child.goals && (
            <p className="mt-1 text-sm text-gray-500">
              Goal: {child.goals}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("today")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "today"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("thisWeek")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "thisWeek"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          This Week
        </button>
      </div>

      {/* Today Tab */}
      {activeTab === "today" && (
        <>
          {/* Nutrition Section */}
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <NutrientDetail
              targets={child.targets}
              todayIntake={child.todayIntake}
            />
          </section>

          {/* Meals Section */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Today&apos;s Meals
            </h3>
            <MealList meals={child.todayMeals} />
          </section>
        </>
      )}

      {/* This Week Tab */}
      {activeTab === "thisWeek" && (
        <>
          {weeklyLoading && <WeeklyLoadingSpinner />}

          {weeklyError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-600">
              {weeklyError}
            </div>
          )}

          {weeklyData && !weeklyLoading && (
            <>
              {/* 7-day summary tiles */}
              <WeeklySummary
                weeklyAveragePercent={weeklyData.weeklyAveragePercent}
                childName={child.name}
              />

              {/* Calories chart */}
              <section className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Calories
                </h3>
                <WeeklyChart
                  days={weeklyData.days}
                  nutrient="calories"
                  target={weeklyData.child.targets["calories"]?.target ?? 0}
                  unit={weeklyData.child.targets["calories"]?.unit ?? "kcal"}
                />
              </section>

              {/* Collapsible more nutrients */}
              <section>
                <button
                  type="button"
                  onClick={() => setShowMoreCharts((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <span>More nutrients</span>
                  <span className="text-xs text-gray-400">
                    {showMoreCharts ? "▲" : "▼"}
                  </span>
                </button>

                {showMoreCharts && (
                  <div className="mt-3 space-y-4">
                    {MORE_NUTRIENTS.map(({ key, label }) => (
                      <div
                        key={key}
                        className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                      >
                        <h3 className="mb-3 text-sm font-semibold text-gray-900">
                          {label}
                        </h3>
                        <WeeklyChart
                          days={weeklyData.days}
                          nutrient={key}
                          target={
                            weeklyData.child.targets[key]?.target ?? 0
                          }
                          unit={weeklyData.child.targets[key]?.unit ?? ""}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
