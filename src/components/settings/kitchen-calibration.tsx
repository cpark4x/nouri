"use client";

import { useState, useEffect, useRef } from "react";

interface KitchenItem {
  id: string;
  name: string;
  type: string;
  photoUrl: string | null;
  estimatedDimensions: Record<string, unknown> | null;
  createdAt: string;
}

const ITEM_TYPES = ["plate", "bowl", "glass", "cup"] as const;
type ItemType = (typeof ITEM_TYPES)[number];

const TYPE_LABELS: Record<ItemType, string> = {
  plate: "Plate",
  bowl: "Bowl",
  glass: "Glass",
  cup: "Cup",
};

const TYPE_BADGE_CLASSES: Record<string, string> = {
  plate: "bg-orange-100 text-orange-700",
  bowl: "bg-blue-100 text-blue-700",
  glass: "bg-cyan-100 text-cyan-700",
  cup: "bg-purple-100 text-purple-700",
};

function formatDimensions(dims: Record<string, unknown> | null): string {
  if (!dims) return "";
  const parts: string[] = [];
  if (dims.diameterCm != null) parts.push(`⌀ ${dims.diameterCm}cm`);
  if (dims.heightCm != null) parts.push(`h ${dims.heightCm}cm`);
  if (dims.volumeMl != null) parts.push(`${dims.volumeMl}ml`);
  return parts.join(" · ");
}

export default function KitchenCalibration() {
  const [items, setItems] = useState<KitchenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<ItemType>("plate");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      const res = await fetch("/api/kitchen");
      if (!res.ok) throw new Error("Failed to load kitchen items");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;

    setSaving(true);
    setError(null);

    try {
      let photoUrl: string | undefined;

      // Upload photo if one was selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          throw new Error(data.error ?? "Failed to upload photo");
        }

        const { url } = await uploadRes.json();
        photoUrl = url as string;
      }

      // Create the kitchen item
      const res = await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, photoUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save item");
      }

      const { item } = await res.json();
      setItems((prev) => [item as KitchenItem, ...prev]);

      // Reset form
      setName("");
      setType("plate");
      clearPhoto();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this kitchen item?")) return;

    try {
      const res = await fetch(`/api/kitchen/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete item");
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Kitchen Items</h2>
        <p className="mt-1 text-sm text-gray-500">
          Adding your commonly used items helps Nouri estimate portion sizes
          more accurately from food photos.
        </p>
      </div>

      {/* Item list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">
          No kitchen items yet. Add a plate, bowl, or glass to get started.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {items.map((item) => {
            const dims = item.estimatedDimensions as Record<
              string,
              unknown
            > | null;
            const dimSummary = formatDimensions(dims);
            const description =
              dims && typeof dims.description === "string"
                ? dims.description
                : null;

            return (
              <li key={item.id} className="flex items-center gap-3 p-3">
                {/* Thumbnail */}
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {item.name}
                    </span>
                    <span
                      className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_CLASSES[item.type] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {TYPE_LABELS[item.type as ItemType] ?? item.type}
                    </span>
                  </div>
                  {description && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {description}
                    </p>
                  )}
                  {dimSummary && !description && (
                    <p className="mt-0.5 text-xs text-gray-500">{dimSummary}</p>
                  )}
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="flex-shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  aria-label={`Remove ${item.name}`}
                >
                  🗑️
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add item form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-gray-200 p-4"
      >
        <h3 className="text-sm font-medium text-gray-700">Add an item</h3>

        {/* Name input */}
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. White dinner plate, Mason's blue cup"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>

        {/* Type selector */}
        <div className="flex gap-2">
          {ITEM_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                type === t
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Photo upload */}
        <div>
          {!previewUrl ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="kitchen-photo-input"
              />
              <label
                htmlFor="kitchen-photo-input"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                  />
                </svg>
                Add photo (optional)
              </label>
            </div>
          ) : (
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt="Item preview"
                className="h-24 w-24 rounded-md object-cover"
              />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute -right-2 -top-2 rounded-full bg-gray-900 p-0.5 text-white"
                aria-label="Remove photo"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving…
            </span>
          ) : (
            "Add Item"
          )}
        </button>
      </form>
    </section>
  );
}
