"use client";

import { useRef, useState } from "react";
import type { ParsedMeal } from "@/lib/ai/types";
import { inferMealType, MEAL_TYPE_LABELS } from "@/lib/meal-type-inference";
import type { MealType } from "@/lib/meal-type-inference";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export interface TextInputProps {
  childName: string;
  onParsed: (parsed: ParsedMeal, description: string, mealType: string) => void;
}

export default function TextInput({ childName, onParsed }: TextInputProps) {
  const [mealType, setMealType] = useState<MealType>(inferMealType);
  const [pillOpen, setPillOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing…");
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
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  function clearPhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasText = description.trim().length > 0;
    const hasPhoto = selectedFile !== null;
    if ((!hasText && !hasPhoto) || loading) return;

    setLoading(true);
    setError(null);

    try {
      const pathParts = window.location.pathname.split("/");
      const childId = pathParts[pathParts.length - 1];

      if (hasPhoto && selectedFile) {
        // Photo flow: upload then parse-photo
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

        setLoadingMessage("Analyzing food…");
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
        const desc =
          description.trim() ||
          parsed.items.map((item) => item.name).join(", ");
        onParsed(parsed, desc, mealType);
      } else {
        // Text-only flow
        setLoadingMessage("Analyzing…");
        const res = await fetch("/api/log/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId,
            description: description.trim(),
            mealType,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to analyze meal");
        }
        const parsed: ParsedMeal = await res.json();
        onParsed(parsed, description.trim(), mealType);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setLoadingMessage("Analyzing…");
    }
  }

  const canSubmit = (description.trim().length > 0 || selectedFile !== null) && !loading;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Meal type pill */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setPillOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          {MEAL_TYPE_LABELS[mealType]}
          <svg
            className={`h-3.5 w-3.5 transition-transform ${pillOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {pillOpen && (
          <div className="absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-md">
            {MEAL_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setMealType(type);
                  setPillOpen(false);
                }}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  mealType === type
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {MEAL_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Photo preview */}
      {previewUrl && (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Food photo preview"
            className="max-h-48 w-full rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={clearPhoto}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
            aria-label="Remove photo"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Textarea + camera button */}
      <div className="relative">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`What did ${childName} have for ${MEAL_TYPE_LABELS[mealType].toLowerCase()}?`}
          rows={4}
          className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 pr-12 text-base placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
        />
        {/* Camera icon button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-3 right-3 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Add photo"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
        </button>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!canSubmit}
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
          "Log Meal"
        )}
      </button>
    </form>
  );
}
