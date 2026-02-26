"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import TextInput from "@/components/log/text-input";
import PhotoInput from "@/components/log/photo-input";
import MealConfirmation from "@/components/log/meal-confirmation";
import QuickRelog from "@/components/log/quick-relog";
import type { ParsedMeal } from "@/lib/ai/types";

type LogState = "input" | "confirming" | "saving";
type InputMode = "text" | "photo";

export default function MealLogPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();

  const [state, setState] = useState<LogState>("input");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [childName, setChildName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parsed meal data held between states
  const [parsedMeal, setParsedMeal] = useState<ParsedMeal | null>(null);
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch child name on mount
  useEffect(() => {
    async function fetchChild() {
      try {
        const res = await fetch(`/api/child/${childId}`);
        if (!res.ok) throw new Error("Failed to load child");
        const data = await res.json();
        setChildName(data.name);
      } catch {
        setError("Could not load child profile");
      } finally {
        setLoading(false);
      }
    }
    fetchChild();
  }, [childId]);

  function handleTextParsed(parsed: ParsedMeal, desc: string, meal: string) {
    setParsedMeal(parsed);
    setDescription(desc);
    setMealType(meal);
    setPhotoUrl(null);
    setState("confirming");
  }

  function handlePhotoParsed(parsed: ParsedMeal, url: string, meal: string) {
    setParsedMeal(parsed);
    setPhotoUrl(url);
    setMealType(meal);
    // Generate description from parsed food items
    setDescription(parsed.items.map((item) => item.name).join(", "));
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
        const data = await res.json();
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

      {/* Error banner */}
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

      {/* Input mode tabs — only visible in input state */}
      {state === "input" && (
        <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setInputMode("text")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              inputMode === "text"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
            Describe it
          </button>
          <button
            onClick={() => setInputMode("photo")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              inputMode === "photo"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            Take a Photo
          </button>
        </div>
      )}

      {/* State machine */}
      {state === "input" && childName && inputMode === "text" && (
        <TextInput childName={childName} onParsed={handleTextParsed} />
      )}

      {state === "input" && childName && inputMode === "photo" && (
        <PhotoInput childName={childName} onParsed={handlePhotoParsed} />
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
