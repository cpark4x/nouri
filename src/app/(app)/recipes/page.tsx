"use client";

import { useEffect, useState, useCallback } from "react";
import { RecipeList } from "@/components/recipes/recipe-list";
import { AddRecipeModal } from "@/components/recipes/add-recipe-modal";
import { Recipe } from "@/components/recipes/recipe-card";

interface ChildSummary {
  id: string;
  name: string;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [childrenMap, setChildrenMap] = useState<Record<string, string>>({});

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch children for rating labels
  useEffect(() => {
    async function fetchChildren() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, string> = {};
          for (const child of (data.children ?? []) as ChildSummary[]) {
            map[child.id] = child.name;
          }
          setChildrenMap(map);
        }
      } catch {
        // Silently handle — child names are optional display enhancement
      }
    }
    fetchChildren();
  }, []);

  const fetchRecipes = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = q
        ? `/api/recipes?search=${encodeURIComponent(q)}`
        : "/api/recipes";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.recipes ?? []);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes(debouncedSearch);
  }, [debouncedSearch, fetchRecipes]);

  async function handleRate(recipeId: string, childId: string, rating: string) {
    try {
      const res = await fetch(`/api/recipes/${recipeId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, rating }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecipes((prev) =>
          prev.map((r) => {
            if (r.id !== recipeId) return r;
            const withoutOld = r.childRatings.filter(
              (cr) => cr.childId !== childId,
            );
            return { ...r, childRatings: [...withoutOld, data.childRating] };
          }),
        );
      }
    } catch {
      // Silently handle
    }
  }

  async function handleDelete(recipeId: string) {
    try {
      const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
      if (res.ok) {
        setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      }
    } catch {
      // Silently handle
    }
  }

  function handleAdded(recipe: Recipe) {
    setRecipes((prev) => [recipe, ...prev]);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Recipe Library</h1>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          + Add Recipe
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {/* Recipe list */}
      {!loading && (
        <RecipeList
          recipes={recipes}
          childrenMap={childrenMap}
          onRate={handleRate}
          onDelete={handleDelete}
        />
      )}

      {/* Add recipe modal */}
      {showModal && (
        <AddRecipeModal
          onClose={() => setShowModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}
