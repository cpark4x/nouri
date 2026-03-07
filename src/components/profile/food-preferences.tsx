"use client";

import { useState, useEffect } from "react";

interface Preference {
  id: string;
  food: string;
  rating: string;
  notes: string | null;
}

interface Constraint {
  id: string;
  ingredient: string;
  severity: string;
  reason: string | null;
}

const RATINGS = [
  { value: "love", emoji: "\u2764\ufe0f", label: "Love" },
  { value: "like", emoji: "\ud83d\udc4d", label: "Like" },
  { value: "neutral", emoji: "\ud83d\ude10", label: "Neutral" },
  { value: "dislike", emoji: "\ud83d\udc4e", label: "Dislike" },
  { value: "hate", emoji: "\ud83d\udeab", label: "Hate" },
];

const SEVERITIES = [
  { value: "allergy", label: "Allergy" },
  { value: "intolerance", label: "Intolerance" },
  { value: "avoid", label: "Preference" },
];

function ratingEmoji(rating: string): string {
  return RATINGS.find((r) => r.value === rating)?.emoji || "?";
}

function severityLabel(severity: string): string {
  return SEVERITIES.find((s) => s.value === severity)?.label ?? severity;
}

export default function FoodPreferences({
  childId,
}: {
  childId: string;
}) {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Add preference form
  const [newFood, setNewFood] = useState("");
  const [newRating, setNewRating] = useState("like");
  const [newNotes, setNewNotes] = useState("");

  // Inline edit preference
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFood, setEditFood] = useState("");
  const [editRating, setEditRating] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Add constraint form
  const [newIngredient, setNewIngredient] = useState("");
  const [newSeverity, setNewSeverity] = useState("avoid");
  const [savingConstraint, setSavingConstraint] = useState(false);

  useEffect(() => {
    fetchPreferences();
    fetchConstraints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  async function fetchPreferences() {
    try {
      const res = await fetch(`/api/child/${childId}/preferences`);
      if (res.ok) {
        setPreferences(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function fetchConstraints() {
    try {
      const res = await fetch(`/api/child/${childId}/constraints`);
      if (res.ok) {
        setConstraints(await res.json());
      }
    } catch {
      // silently fail
    }
  }

  async function handleAdd() {
    if (!newFood.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/child/${childId}/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food: newFood.trim(),
          rating: newRating,
          notes: newNotes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setNewFood("");
      setNewRating("like");
      setNewNotes("");
      setMessage({ type: "success", text: "Preference saved!" });
      fetchPreferences();
    } catch {
      setMessage({ type: "error", text: "Failed to save preference" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/child/${childId}/preferences`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      fetchPreferences();
    } catch {
      setMessage({ type: "error", text: "Failed to delete preference" });
    }
  }

  function startEdit(pref: Preference) {
    setEditingId(pref.id);
    setEditFood(pref.food);
    setEditRating(pref.rating);
    setEditNotes(pref.notes || "");
  }

  async function handleEditSave() {
    if (!editFood.trim() || !editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/child/${childId}/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food: editFood.trim(),
          rating: editRating,
          notes: editNotes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingId(null);
      fetchPreferences();
    } catch {
      setMessage({ type: "error", text: "Failed to update preference" });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddConstraint() {
    if (!newIngredient.trim()) return;
    setSavingConstraint(true);
    try {
      const res = await fetch(`/api/child/${childId}/constraints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredient: newIngredient.trim(),
          severity: newSeverity,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setNewIngredient("");
      setNewSeverity("avoid");
      fetchConstraints();
    } catch {
      setMessage({ type: "error", text: "Failed to save ingredient constraint" });
    } finally {
      setSavingConstraint(false);
    }
  }

  async function handleDeleteConstraint(constraintId: string) {
    try {
      const res = await fetch(
        `/api/child/${childId}/constraints?id=${constraintId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete");
      fetchConstraints();
    } catch {
      setMessage({ type: "error", text: "Failed to delete constraint" });
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Add New Preference ── */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">
          Add Food Preference
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            value={newFood}
            onChange={(e) => setNewFood(e.target.value)}
            placeholder="Food name (e.g. Broccoli)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <div>
            <label className="mb-1 block text-xs text-gray-500">Rating</label>
            <div className="flex gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setNewRating(r.value)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-center text-sm transition-colors ${
                    newRating === r.value
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                  title={r.label}
                >
                  <span className="text-lg">{r.emoji}</span>
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          {message && (
            <p
              className={`text-sm ${
                message.type === "success" ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {message.text}
            </p>
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !newFood.trim()}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add"}
          </button>
        </div>
      </div>

      {/* ── Current Preferences ── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Current Preferences
        </h3>
        {loading ? (
          <p className="text-sm text-gray-500">Loading preferences...</p>
        ) : preferences.length === 0 ? (
          <p className="text-sm text-gray-500">No food preferences yet.</p>
        ) : (
          <div className="space-y-2">
            {preferences.map((pref) =>
              editingId === pref.id ? (
                /* ── Inline edit mode ── */
                <div
                  key={pref.id}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 p-3"
                >
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editFood}
                      onChange={(e) => setEditFood(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                    <div className="flex gap-1">
                      {RATINGS.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setEditRating(r.value)}
                          className={`flex-1 rounded border px-1 py-1 text-center text-sm ${
                            editRating === r.value
                              ? "border-emerald-500 bg-white"
                              : "border-gray-200"
                          }`}
                        >
                          {r.emoji}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Notes"
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleEditSave}
                        disabled={saving}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Display mode ── */
                <div
                  key={pref.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <button
                    type="button"
                    onClick={() => startEdit(pref)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span className="text-xl">{ratingEmoji(pref.rating)}</span>
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {pref.food}
                      </span>
                      {pref.notes && (
                        <p className="text-xs text-gray-500">{pref.notes}</p>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(pref.id)}
                    className="ml-2 text-sm text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* ── Ingredients to Avoid ── */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 className="mb-1 text-sm font-semibold text-gray-900">
          Ingredients to Avoid
        </h3>
        <p className="mb-4 text-xs text-gray-500">
          Nouri will never suggest foods containing these ingredients.
        </p>

        {/* Existing constraints */}
        {constraints.length > 0 && (
          <div className="mb-4 space-y-2">
            {constraints.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {c.ingredient}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.severity === "allergy"
                        ? "bg-red-100 text-red-700"
                        : c.severity === "intolerance"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {severityLabel(c.severity)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteConstraint(c.id)}
                  className="ml-2 text-sm text-red-500 hover:text-red-700"
                  aria-label={`Remove ${c.ingredient}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add constraint form */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newIngredient}
            onChange={(e) => setNewIngredient(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddConstraint()}
            placeholder="Ingredient (e.g. peanuts)"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
          <select
            value={newSeverity}
            onChange={(e) => setNewSeverity(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-amber-500 focus:outline-none"
          >
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddConstraint}
            disabled={savingConstraint || !newIngredient.trim()}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {savingConstraint ? "..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
