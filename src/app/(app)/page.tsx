"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChildCard } from "@/components/dashboard/child-card";
import {
  subDays,
  addDays,
  isSameDay,
  toDateParam,
  formatDateLabel,
} from "@/app/api/dashboard/logic";

interface ChildData {
  id: string;
  name: string;
  age: number;
  photoUrl: string | null;
  targets: Record<string, { target: number; unit: string }>;
  todayIntake: Record<string, { amount: number; unit: string }>;
  todayMeals: { mealType: string; logged: boolean; summary?: string }[];
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200" />
        <div className="space-y-1.5">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-3 w-16 rounded bg-gray-200" />
        </div>
      </div>
      <div className="mb-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="h-2.5 flex-1 rounded-full bg-gray-100" />
            <div className="h-3 w-20 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-16 rounded bg-gray-200" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const goBack = () => setSelectedDate((d) => subDays(d, 1));
  const goForward = () => setSelectedDate((d) => addDays(d, 1));
  const isToday = isSameDay(selectedDate, new Date());
  const dateLabel = formatDateLabel(selectedDate);

  useEffect(() => {
    setLoading(true);
    async function fetchDashboard() {
      try {
        const dateParam = toDateParam(selectedDate);
        const res = await fetch(`/api/dashboard?date=${dateParam}`);
        if (res.ok) {
          const data = await res.json();
          setChildren(data.children ?? []);
        }
      } catch {
        // Silently handle fetch errors — user sees empty state
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [selectedDate]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Date navigation */}
      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={goBack}
          className="rounded-lg p-2 text-xl leading-none text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          aria-label="Previous day"
        >
          ‹
        </button>
        <h1 className="flex-1 text-center text-xl font-semibold text-gray-900">
          {dateLabel}
        </h1>
        <button
          onClick={goForward}
          disabled={isToday}
          className="rounded-lg p-2 text-xl leading-none text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid gap-5 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Children cards */}
      {!loading && children.length > 0 && (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            {children.map((child) => (
              <ChildCard key={child.id} {...child} selectedDate={selectedDate} />
            ))}
          </div>

          {/* Family meal button — only show when there are 2+ children */}
          {children.length >= 2 && (
            <div className="mt-5 flex justify-center">
              <Link
                href="/log/family"
                className="w-full rounded-lg border border-gray-200 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 md:w-auto md:px-8"
              >
                Log Family Meal
              </Link>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && children.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16">
          <p className="text-lg font-medium text-gray-600">
            No children profiles found
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Add your children in Settings to start tracking nutrition.
          </p>
        </div>
      )}
    </div>
  );
}
