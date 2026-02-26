"use client";

import { useState } from "react";
import { Recipe } from "./recipe-card";

interface AddRecipeModalProps {
  onClose: () => void;
  onAdded: (recipe: Recipe) => void;
}

export function AddRecipeModal({ onClose, onAdded }: AddRecipeModalProps) {
  const [activeTab, setActiveTab] = useState<"describe" | "url">("describe");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          tags,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save recipe.");
        return;
      }

      const data = await res.json();
      onAdded(data.recipe as Recipe);
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Add Recipe</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === "describe"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("describe")}
          >
            Describe it
          </button>
          <button
            type="button"
            disabled
            title="Coming in M3.2"
            className="relative flex-1 py-2 text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed"
          >
            Paste a URL
            <span className="ml-1 text-xs text-gray-400">(M3.2)</span>
          </button>
        </div>

        {/* Describe it form */}
        {activeTab === "describe" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="recipe-title"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="recipe-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chicken stir-fry"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="recipe-description"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Description{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="recipe-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief notes about the recipe…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
              />
            </div>

            <div>
              <label
                htmlFor="recipe-tags"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Tags{" "}
                <span className="text-gray-400 font-normal">
                  (comma-separated, optional)
                </span>
              </label>
              <input
                id="recipe-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="quick, high-protein, family-favorite"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save Recipe"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
