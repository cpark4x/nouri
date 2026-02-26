"use client";

import { useState, useRef } from "react";

interface Sport {
  name: string;
  frequency: string;
  intensity: string;
}

interface ProfileFormProps {
  child: {
    id: string;
    name: string;
    photoUrl: string | null;
    heightCm: number | null;
    weightKg: number | null;
    activityProfile: { sports?: Sport[] } | null;
    goals: string | null;
  };
  onUpdate?: () => void;
}

export default function ProfileForm({ child, onUpdate }: ProfileFormProps) {
  const [photoUrl, setPhotoUrl] = useState(child.photoUrl || "");
  const [heightCm, setHeightCm] = useState(child.heightCm?.toString() || "");
  const [weightKg, setWeightKg] = useState(child.weightKg?.toString() || "");
  const [sports, setSports] = useState<Sport[]>(() => {
    const profile = child.activityProfile as { sports?: Sport[] } | null;
    return profile?.sports || [];
  });
  const [goals, setGoals] = useState(child.goals || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newSport, setNewSport] = useState({
    name: "",
    frequency: "",
    intensity: "moderate",
  });

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setPhotoUrl(url);
    } catch {
      setMessage({ type: "error", text: "Failed to upload photo" });
    } finally {
      setUploading(false);
    }
  }

  function addSport() {
    if (!newSport.name.trim()) return;
    setSports([...sports, { ...newSport, name: newSport.name.trim() }]);
    setNewSport({ name: "", frequency: "", intensity: "moderate" });
  }

  function removeSport(index: number) {
    setSports(sports.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/child/${child.id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl: photoUrl || null,
          heightCm: heightCm ? parseFloat(heightCm) : null,
          weightKg: weightKg ? parseFloat(weightKg) : null,
          activityProfile: { sports },
          goals: goals || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: "Profile updated successfully!" });
      onUpdate?.();
    } catch {
      setMessage({ type: "error", text: "Failed to save changes" });
    } finally {
      setSaving(false);
    }
  }

  const initials = child.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Photo */}
      <div className="flex items-center gap-4">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={child.name}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
            {initials}
          </div>
        )}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Change Photo"}
          </button>
        </div>
      </div>

      {/* Height & Weight */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Height (cm)
          </label>
          <input
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            placeholder="e.g. 120"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Weight (kg)
          </label>
          <input
            type="number"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="e.g. 25"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Activities */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Activities &amp; Sports
        </label>
        {sports.length > 0 && (
          <div className="mb-3 space-y-2">
            {sports.map((sport, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
              >
                <div className="text-sm">
                  <span className="font-medium">{sport.name}</span>
                  {sport.frequency && (
                    <span className="text-gray-500"> &middot; {sport.frequency}</span>
                  )}
                  <span className="ml-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                    {sport.intensity}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSport(i)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newSport.name}
            onChange={(e) =>
              setNewSport({ ...newSport, name: e.target.value })
            }
            placeholder="Sport name"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <input
            type="text"
            value={newSport.frequency}
            onChange={(e) =>
              setNewSport({ ...newSport, frequency: e.target.value })
            }
            placeholder="e.g. 3x/week"
            className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <select
            value={newSport.intensity}
            onChange={(e) =>
              setNewSport({ ...newSport, intensity: e.target.value })
            }
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
          <button
            type="button"
            onClick={addSport}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add
          </button>
        </div>
      </div>

      {/* Goals */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Goals
        </label>
        <textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder="e.g. Gain healthy weight, improve iron levels"
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Feedback */}
      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
