"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { NutrientDetail } from "@/components/dashboard/nutrient-detail";
import { MealList } from "@/components/dashboard/meal-list";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { WeeklySummary } from "@/components/dashboard/weekly-summary";
import { WeeklyInsight } from "@/components/dashboard/weekly-insight";
import type { DayData } from "@/components/dashboard/weekly-chart";
import {
  calculateTargets,
  deriveActivityLevel,
} from "@/lib/targets/calculate";
import type { ChildProfile } from "@/lib/targets/calculate";
import {
  subDays,
  addDays,
  isSameDay,
  toDateParam,
  formatDateLabel,
} from "@/app/api/dashboard/logic";
import { CelebrationOverlay } from "@/components/gamification/celebration";
import { MilestoneForm } from "@/components/gamification/milestone-form";

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

interface AchievementRow {
  key: string;
  name: string;
  description: string;
  iconRef: string;
  earned: boolean;
  earnedAt: string | null;
}

interface MilestoneGoalRow {
  id: string;
  description: string;
  targetCount: number;
  currentCount: number;
  completedAt: string | null;
  createdByName: string;
}

interface GamificationData {
  points: number;
  achievements: AchievementRow[];
  milestoneGoals: MilestoneGoalRow[];
}

interface CelebrationState {
  badges: string[];
  milestones: string[];
  pointsEarned: number;
}

const MORE_NUTRIENTS: { key: string; label: string }[] = [
  { key: "protein", label: "Protein" },
  { key: "calcium", label: "Calcium" },
  { key: "vitaminD", label: "Vitamin D" },
];

/** Human-readable nutrient names for the "How targets are set" section. */
const NUTRIENT_LABELS: Record<string, string> = {
  calories: "Calories",
  protein: "Protein",
  calcium: "Calcium",
  vitaminD: "Vitamin D",
  iron: "Iron",
  zinc: "Zinc",
  magnesium: "Magnesium",
  potassium: "Potassium",
  vitaminA: "Vitamin A",
  vitaminC: "Vitamin C",
  fiber: "Fiber",
  omega3: "Omega-3",
};

/** Format a numeric nutrient amount with its unit for display. */
function formatTargetAmount(amount: number, unit: string): string {
  const formatted = amount >= 1000 ? amount.toLocaleString() : String(amount);
  return `${formatted}\u202f${unit}`; // narrow no-break space before unit
}

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

/** Single achievement tile: colored when earned, greyed when not. */
function AchievementTile({ badge }: { badge: AchievementRow }) {
  return (
    <div
      title={badge.description}
      className={`flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-center transition-opacity ${
        badge.earned
          ? "bg-amber-50 shadow-sm"
          : "bg-gray-50 opacity-40 grayscale"
      }`}
    >
      <span className="text-2xl leading-none">{badge.iconRef}</span>
      <span
        className={`text-xs font-medium leading-tight ${
          badge.earned ? "text-amber-800" : "text-gray-500"
        }`}
      >
        {badge.name}
      </span>
    </div>
  );
}

/** Milestone goal row with progress bar. */
function MilestoneGoalCard({ goal }: { goal: MilestoneGoalRow }) {
  const pct = Math.min(
    100,
    Math.round((goal.currentCount / goal.targetCount) * 100),
  );
  const isComplete = goal.completedAt !== null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{goal.description}</p>
        {isComplete && (
          <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Done ✓
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${
            isComplete ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {goal.currentCount}/{goal.targetCount}
        </span>
        <span className="text-xs text-gray-400">
          Set by {goal.createdByName} · {pct}% complete
        </span>
      </div>
    </div>
  );
}

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [child, setChild] = useState<ChildDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date navigation — starts at today, allows browsing to any past day
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Tab state
  const [activeTab, setActiveTab] = useState<"today" | "thisWeek">("today");
  const todayTabRef = useRef<HTMLButtonElement>(null);
  const thisWeekTabRef = useRef<HTMLButtonElement>(null);

  // Weekly data state
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [weeklyFetched, setWeeklyFetched] = useState(false);

  // Collapsible more-nutrients section
  const [showMoreCharts, setShowMoreCharts] = useState(false);

  // Collapsible "How targets are set" section
  const [showTargetSources, setShowTargetSources] = useState(false);

  // Gamification state
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [gamificationLoading, setGamificationLoading] = useState(false);

  // Celebration overlay (triggered by URL params after meal save)
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);

  // Check URL params for celebration data (set by log page after save)
  useEffect(() => {
    const badges = searchParams.get("newBadges");
    const milestones = searchParams.get("completedMilestones");
    const points = searchParams.get("pointsEarned");

    if (badges || milestones || points) {
      setCelebration({
        badges: badges ? badges.split(",").filter(Boolean) : [],
        milestones: milestones ? milestones.split("|").filter(Boolean) : [],
        pointsEarned: points ? parseInt(points, 10) : 0,
      });

      // Clear gamification params from URL without navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("newBadges");
      url.searchParams.delete("completedMilestones");
      url.searchParams.delete("pointsEarned");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);

  const fetchGamification = useCallback(async () => {
    setGamificationLoading(true);
    try {
      const res = await fetch(`/api/child/${id}/gamification`);
      if (res.ok) {
        const data = await res.json();
        setGamification(data as GamificationData);
      }
    } catch {
      // Non-blocking: gamification data failing shouldn't break the page
    } finally {
      setGamificationLoading(false);
    }
  }, [id]);

  // Fetch the selected day's data; re-runs when id or selectedDate changes
  useEffect(() => {
    async function fetchChild() {
      setLoading(true);
      setError(null);
      try {
        const isToday = isSameDay(selectedDate, new Date());
        const url = isToday
          ? `/api/child/${id}`
          : `/api/child/${id}?date=${toDateParam(selectedDate)}`;
        const res = await fetch(url);
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
  }, [id, selectedDate]);

  // Fetch gamification data once on mount
  useEffect(() => {
    fetchGamification();
  }, [fetchGamification]);

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
        // Only mark as fetched on success — errors stay retryable by
        // leaving the tab and coming back.
        setWeeklyFetched(true);
      } catch {
        setWeeklyError("Failed to load weekly data");
      } finally {
        setWeeklyLoading(false);
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

  const isViewingToday = isSameDay(selectedDate, new Date());
  const dateLabel = formatDateLabel(selectedDate);
  const mealsHeading = isViewingToday
    ? "Today's Meals"
    : `Meals — ${dateLabel}`;

  const earnedCount =
    gamification?.achievements.filter((a) => a.earned).length ?? 0;
  const activeGoals =
    gamification?.milestoneGoals.filter((g) => !g.completedAt) ?? [];
  const completedGoals =
    gamification?.milestoneGoals.filter((g) => g.completedAt) ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Celebration overlay — triggered by URL params after meal save */}
      {celebration &&
        (celebration.badges.length > 0 ||
          celebration.milestones.length > 0) && (
          <CelebrationOverlay
            badges={celebration.badges}
            milestones={celebration.milestones}
            pointsEarned={celebration.pointsEarned}
            onDismiss={() => setCelebration(null)}
          />
        )}

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

          {/* Points badge */}
          {gamification !== null && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              ⭐ {gamification.points.toLocaleString()} pts
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Child data views"
        className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1"
      >
        <button
          ref={todayTabRef}
          type="button"
          role="tab"
          id="tab-today"
          aria-selected={activeTab === "today"}
          aria-controls="panel-today"
          tabIndex={activeTab === "today" ? 0 : -1}
          onClick={() => setActiveTab("today")}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              setActiveTab("thisWeek");
              thisWeekTabRef.current?.focus();
            }
          }}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "today"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Today
        </button>
        <button
          ref={thisWeekTabRef}
          type="button"
          role="tab"
          id="tab-thisWeek"
          aria-selected={activeTab === "thisWeek"}
          aria-controls="panel-thisWeek"
          tabIndex={activeTab === "thisWeek" ? 0 : -1}
          onClick={() => setActiveTab("thisWeek")}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              setActiveTab("today");
              todayTabRef.current?.focus();
            }
          }}
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
        <div role="tabpanel" id="panel-today" aria-labelledby="tab-today">
          {/* Date navigator — same < [Label] > pattern as B4 dashboard */}
          <div className="mb-4 flex items-center justify-center gap-4">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => setSelectedDate((d) => subDays(d, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              &#8249;
            </button>
            <span className="min-w-[6rem] text-center text-sm font-medium text-gray-700">
              {dateLabel}
            </span>
            <button
              type="button"
              aria-label="Next day"
              disabled={isViewingToday}
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
            >
              &#8250;
            </button>
          </div>

          {/* Nutrition Section */}
          <section className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <NutrientDetail
              targets={child.targets}
              todayIntake={child.todayIntake}
            />
          </section>

          {/* How Targets Are Set — collapsible explainer */}
          {(() => {
            const profile: ChildProfile = {
              ageYears: child.age,
              gender: child.gender === "female" ? "female" : "male",
              weightKg: child.weightKg ?? 0,
              heightCm: child.heightCm ?? 0,
              activityLevel: deriveActivityLevel(child.activityProfile),
            };
            const computedTargets = calculateTargets(profile);
            return (
              <section className="mb-8">
                <button
                  type="button"
                  aria-expanded={showTargetSources}
                  onClick={() => setShowTargetSources((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <span>How targets are set</span>
                  <span className="text-xs text-gray-400" aria-hidden="true">
                    {showTargetSources ? "▲" : "▼"}
                  </span>
                </button>

                {showTargetSources && (
                  <div className="mt-1 rounded-b-lg border border-t-0 border-gray-200 bg-white px-4 pb-4 pt-3">
                    <p className="mb-3 text-xs text-gray-500">
                      Targets use USDA Dietary Reference Intakes (DRI) for{" "}
                      {child.age}yo {child.gender === "female" ? "females" : "males"},{" "}
                      adjusted for activity level.
                    </p>
                    <ul className="space-y-2">
                      {computedTargets.map((t) => (
                        <li key={t.nutrient} className="text-xs">
                          <span className="font-medium text-gray-800">
                            {NUTRIENT_LABELS[t.nutrient] ?? t.nutrient}:{" "}
                            {formatTargetAmount(t.amount, t.unit)}/day
                          </span>
                          <span className="ml-1 text-gray-500">
                            — {t.source}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })()}

          {/* Meals Section */}
          <section className="mb-8">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              {mealsHeading}
            </h3>
            <MealList meals={child.todayMeals} />
          </section>

          {/* ─── Achievements Section ───────────────────────────────────────── */}
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Achievements
              </h3>
              {gamification && (
                <span className="text-xs text-gray-400">
                  {earnedCount}/{gamification.achievements.length} earned
                </span>
              )}
            </div>

            {gamificationLoading && !gamification && (
              <div className="flex justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
              </div>
            )}

            {gamification && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {gamification.achievements.map((badge) => (
                  <AchievementTile key={badge.key} badge={badge} />
                ))}
              </div>
            )}
          </section>

          {/* ─── Milestone Goals Section ────────────────────────────────────── */}
          <section className="mb-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Goals</h3>

            {gamificationLoading && !gamification && (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
              </div>
            )}

            {gamification && (
              <>
                {activeGoals.length === 0 && completedGoals.length === 0 && (
                  <p className="mb-3 text-sm text-gray-400">
                    No goals set yet.
                  </p>
                )}

                {/* Active goals */}
                {activeGoals.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {activeGoals.map((goal) => (
                      <MilestoneGoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                )}

                {/* Completed goals (collapsible) */}
                {completedGoals.length > 0 && (
                  <details className="mb-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-500">
                    <summary className="cursor-pointer select-none py-1 font-medium">
                      {completedGoals.length} completed goal
                      {completedGoals.length !== 1 ? "s" : ""}
                    </summary>
                    <div className="mt-2 space-y-2">
                      {completedGoals.map((goal) => (
                        <MilestoneGoalCard key={goal.id} goal={goal} />
                      ))}
                    </div>
                  </details>
                )}

                {/* Parent form to add a new goal */}
                <MilestoneForm
                  childId={child.id}
                  onCreated={fetchGamification}
                />
              </>
            )}
          </section>
        </div>
      )}

      {/* This Week Tab */}
      {activeTab === "thisWeek" && (
        <div role="tabpanel" id="panel-thisWeek" aria-labelledby="tab-thisWeek">
          {weeklyLoading && <WeeklyLoadingSpinner />}

          {weeklyError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-600">
              {weeklyError}
            </div>
          )}

          {weeklyData && !weeklyLoading && (
            <>
              {/* AI weekly insight */}
              <WeeklyInsight childId={id} childName={child.name} />

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
                  aria-expanded={showMoreCharts}
                  onClick={() => setShowMoreCharts((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <span>More nutrients</span>
                  <span className="text-xs text-gray-400" aria-hidden="true">
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
        </div>
      )}
    </div>
  );
}
