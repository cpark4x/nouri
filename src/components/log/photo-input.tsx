"use client";

import { useRef, useState } from "react";
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

interface PhotoInputProps {
  childName: string;
  onParsed: (parsed: ParsedMeal, photoUrl: string, mealType: string) => void;
}

export default function PhotoInput({ childName, onParsed }: PhotoInputProps) {
  const [mealType, setMealType] = useState(getDefaultMealType);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  function clearSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Upload the image
      setLoadingMessage("Uploading photo…");
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.error || "Failed to upload photo");
      }

      const { url: photoUrl } = await uploadRes.json();

      // Step 2: Analyze the photo
      setLoadingMessage("Analyzing food…");
      const pathParts = window.location.pathname.split("/");
      const childId = pathParts[pathParts.length - 1];

      const parseRes = await fetch("/api/log/parse-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, imageUrl: photoUrl, mealType }),
      });

      if (!parseRes.ok) {
        const data = await parseRes.json();
        throw new Error(data.error || "Failed to analyze photo");
      }

      const parsed: ParsedMeal = await parseRes.json();
      onParsed(parsed, photoUrl, mealType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setLoadingMessage("");
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

      {/* Photo input area */}
      {!previewUrl ? (
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 transition-colors hover:border-gray-400 hover:bg-gray-50">
          <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          <span className="text-sm font-medium text-gray-600">
            Take a Photo or Choose from Library
          </span>
          <span className="text-xs text-gray-400">
            {childName}&apos;s meal — up to 10MB
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      ) : (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Food photo preview"
            className="w-full rounded-lg object-cover"
            style={{ maxHeight: "300px" }}
          />
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
            aria-label="Remove photo"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!selectedFile || loading}
        className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {loadingMessage}
          </span>
        ) : (
          "Analyze Photo"
        )}
      </button>
    </form>
  );
}