"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import TextInput from "@/components/log/text-input";
import MealConfirmation from "@/components/log/meal-confirmation";
import QuickRelog from "@/components/log/quick-relog";
import type { ParsedMeal } from "@/lib/ai/types";
import type { MealType } from "@/lib/meal-type-inference";

type LogState = "input" | "confirming";

export default function MealLogPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();

  const [state, setState] = useState<LogState>("input");
  const [childName, setChildName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parsed meal data held between states
  const [parsedMeal, setParsedMeal] = useState<ParsedMeal | null>(null);
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState<MealType | "">("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch child name on mount; abort if childId changes or component unmounts
  useEffect(() => {
    const controller = new AbortController();

    async function fetchChild() {
      try {
        const res = await fetch(`/api/child/${childId}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load child");
        const data = await res.json() as { name: string };
        setChildName(data.name);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Could not load child profile");
      } finally {
        setLoading(false);
      }
    }
    fetchChild();

    return () => controller.abort();
  }, [childId]);

  function handleParsed(
    parsed: ParsedMeal,
    desc: string,
    meal: MealType,
    photo?: string,
  ) {
    setParsedMeal(parsed);
    setDescription(desc);
    setMealType(meal);
    setPhotoUrl(photo ?? null);
    setState("confirming");
  }

  async function handleConfirm() {
    if (!parsedMeal || saving) return;
    setSaving(true);

    try {
      const res = await fetch("/api/log/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          mealType,
          description,
          parsedMeal,
          photoUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "Failed to save meal");
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  function handleBack() {
    setState("input");
    setParsedMeal(null);
    setPhotoUrl(null);
    setError(null);
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 space-y-4">
          <div className="h-10 animate-pulse rounded bg-gray-100" />
          <div className="h-32 animate-pulse rounded bg-gray-100" />
          <div className="h-12 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error && !childName) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Back to dashboard"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          Logging for {childName}
        </h1>
      </div>

      {/* Error banner (save errors — TextInput handles its own input errors) */}
      {error && state !== "input" && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}

      {/* Quick re-log — only visible in input state */}
      {state === "input" && childName && (
        <QuickRelog
          childId={childId}
          childName={childName}
          onRelogged={() => router.push("/")}
        />
      )}

      {/* Smart input — handles both text and photo */}
      {state === "input" && childName && (
        <TextInput childName={childName} onParsed={handleParsed} />
      )}

      {state === "confirming" && parsedMeal && childName && (
        <MealConfirmation
          parsedMeal={parsedMeal}
          childName={childName}
          onConfirm={handleConfirm}
          onEdit={handleBack}
          onBack={handleBack}
        />
      )}

      {/* Saving overlay */}
      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80">
          <div className="flex items-center gap-3 text-gray-600">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving meal…
          </div>
        </div>
      )}
    </div>
  );
}
