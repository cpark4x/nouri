"use client";

import { useState } from "react";

export interface RecipeChildRating {
  id: string;
  recipeId: string;
  childId: string;
  rating: string;
  notes: string | null;
}

export interface Recipe {
  id: string;
  familyId: string;
  title: string;
  sourceUrl: string | null;
  sourceName: string | null;
  description: string | null;
  instructions: string | null;
  ingredients: unknown;
  nutritionPerServing: Record<string, number> | null;
  familyRating: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  childRatings: RecipeChildRating[];
}

interface RecipeCardProps {
  recipe: Recipe;
  childrenMap?: Record<string, string>; // childId → childName
  onRate?: (recipeId: string, childId: string, rating: string) => void;
  onDelete?: (recipeId: string) => void;
}

const RATING_LABELS: Record<string, string> = {
  loved: "🥰 Loved",
  ate_it: "😊 Ate it",
  didnt_eat: "😐 Didn't eat",
};

const FAMILY_RATING_LABELS: Record<string, { label: string; color: string }> = {
  loved: { label: "❤️ Family favorite", color: "text-rose-600 bg-rose-50" },
  ok: { label: "👍 OK", color: "text-amber-600 bg-amber-50" },
  skip: { label: "👎 Skip", color: "text-gray-500 bg-gray-100" },
};

const KEY_NUTRIENTS = ["calories", "protein", "calcium", "vitaminD"] as const;
const NUTRIENT_LABELS: Record<string, string> = {
  calories: "Calories",
  protein: "Protein",
  calcium: "Calcium",
  vitaminD: "Vitamin D",
};

export function RecipeCard({
  recipe,
  childrenMap = {},
  onRate,
  onDelete,
}: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const nutrition = recipe.nutritionPerServing as Record<string, number> | null;
  const familyRatingInfo = recipe.familyRating
    ? FAMILY_RATING_LABELS[recipe.familyRating]
    : null;

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmingDelete(true);
  }

  function cancelDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmingDelete(false);
  }

  function doDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmingDelete(false);
    setDeleting(true);
    onDelete?.(recipe.id);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Card header — always visible, click to expand */}
      <button
        type="button"
        className="w-full text-left px-4 pt-4 pb-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 leading-snug">
              {recipe.title}
            </h3>
            {recipe.sourceName && (
              <p className="text-xs text-gray-400 mt-0.5">{recipe.sourceName}</p>
            )}
          </div>
          <span className="text-gray-400 text-xs mt-0.5 shrink-0">
            {expanded ? "▲" : "▼"}
          </span>
        </div>

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Family rating badge */}
        {familyRatingInfo && (
          <span
            className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${familyRatingInfo.color}`}
          >
            {familyRatingInfo.label}
          </span>
        )}

        {/* Child ratings summary */}
        {recipe.childRatings.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {recipe.childRatings.map((cr) => {
              const name = childrenMap[cr.childId] ?? "Child";
              return (
                <span
                  key={cr.id}
                  className="text-xs text-gray-500"
                >
                  <span className="font-medium text-gray-700">{name}:</span>{" "}
                  {RATING_LABELS[cr.rating] ?? cr.rating}
                </span>
              );
            })}
          </div>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          {/* Nutrition per serving */}
          {nutrition && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Per serving
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {KEY_NUTRIENTS.filter((k) => nutrition[k] != null).map((k) => (
                  <div key={k} className="flex justify-between text-xs text-gray-700">
                    <span className="text-gray-500">{NUTRIENT_LABELS[k]}</span>
                    <span className="font-medium">{Math.round(nutrition[k])}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {recipe.instructions && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Instructions
              </p>
              <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                {recipe.instructions}
              </p>
            </div>
          )}

          {/* Rate for each child */}
          {onRate && Object.keys(childrenMap).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Rate it
              </p>
              <div className="space-y-2">
                {Object.entries(childrenMap).map(([childId, childName]) => (
                  <div key={childId} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700 w-20 shrink-0">
                      {childName}
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {(["loved", "ate_it", "didnt_eat"] as const).map((r) => {
                        const current = recipe.childRatings.find(
                          (cr) => cr.childId === childId,
                        )?.rating;
                        const active = current === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => onRate(recipe.id, childId, r)}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                              active
                                ? "bg-gray-900 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {RATING_LABELS[r]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete */}
          {onDelete && (
            <div className="pt-1">
              {confirmingDelete ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Delete this recipe?</span>
                  <button
                    type="button"
                    onClick={cancelDelete}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={doDelete}
                    className="text-sm text-red-600 font-medium hover:text-red-800 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete recipe"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
