"use client";

import { RecipeCard, Recipe } from "./recipe-card";

interface RecipeListProps {
  recipes: Recipe[];
  childrenMap?: Record<string, string>;
  onRate?: (recipeId: string, childId: string, rating: string) => void;
  onDelete?: (recipeId: string) => void;
}

export function RecipeList({
  recipes,
  childrenMap = {},
  onRate,
  onDelete,
}: RecipeListProps) {
  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 px-4">
        <p className="text-center text-base font-medium text-gray-600">
          No recipes yet.
        </p>
        <p className="mt-1 text-center text-sm text-gray-400">
          Save a meal or describe one to Nouri.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-gray-500">
        {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            childrenMap={childrenMap}
            onRate={onRate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
