"use client";

import { useState, useEffect, useCallback } from "react";

interface WeeklyInsightProps {
  childId: string;
  childName: string;
}

interface InsightData {
  insight: string;
  generatedAt: string;
}

function InsightSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 w-3/4 rounded bg-green-200" />
      <div className="h-4 w-full rounded bg-green-200" />
      <div className="h-4 w-5/6 rounded bg-green-200" />
    </div>
  );
}

export function WeeklyInsight({ childId, childName }: WeeklyInsightProps) {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsight = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = force
        ? `/api/child/${childId}/insight?force=true`
        : `/api/child/${childId}/insight`;
      const res = await fetch(url);
      if (!res.ok) {
        const msg =
          res.status >= 500
            ? "Insight service is temporarily unavailable — try again in a moment."
            : "Couldn\u2019t load insight.";
        setError(msg);
        return;
      }
      const json = (await res.json()) as InsightData;
      setData(json);
    } catch {
      setError(
        "Couldn\u2019t reach the server. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  return (
    <div
      className="mb-6 rounded-xl border border-green-100 bg-green-50 p-4"
      aria-label={`Weekly nutrition insight for ${childName}`}
    >
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-gray-500">✨ Nouri&apos;s take</p>
        <button
          type="button"
          onClick={() => fetchInsight(true)}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Refresh insight"
        >
          Refresh
        </button>
      </div>

      {/* Body */}
      {loading && <InsightSkeleton />}

      {!loading && error && (
        <p className="text-sm text-gray-400">{error}</p>
      )}

      {!loading && !error && data && (
        <p className="text-base text-gray-700">{data.insight}</p>
      )}
    </div>
  );
}
