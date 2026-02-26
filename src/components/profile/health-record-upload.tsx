"use client";

import { useState, useEffect, useRef } from "react";

interface HealthRecord {
  id: string;
  type: string;
  date: string;
  data: Record<string, unknown>;
  notes: string | null;
  fileUrl: string | null;
  createdAt: string;
}

const RECORD_TYPES = [
  { value: "blood_work", label: "Blood Work" },
  { value: "growth_measurement", label: "Growth Measurement" },
  { value: "supplement", label: "Supplement" },
  { value: "note", label: "Note" },
];

const TYPE_BADGE_CLASSES: Record<string, string> = {
  blood_work: "bg-red-100 text-red-700",
  growth_measurement: "bg-blue-100 text-blue-700",
  supplement: "bg-purple-100 text-purple-700",
  note: "bg-gray-100 text-gray-700",
};

function summarizeData(record: HealthRecord): string {
  const d = record.data as Record<string, unknown>;
  switch (record.type) {
    case "blood_work": {
      const parts: string[] = [];
      if (d.iron != null) parts.push(`Iron: ${d.iron} mg/dL`);
      if (d.vitaminD != null) parts.push(`Vit D: ${d.vitaminD} ng/mL`);
      if (d.calcium != null) parts.push(`Ca: ${d.calcium} mg/dL`);
      if (d.b12 != null) parts.push(`B12: ${d.b12} pg/mL`);
      return parts.join(", ") || "No values recorded";
    }
    case "growth_measurement": {
      const parts: string[] = [];
      if (d.heightCm != null) parts.push(`${d.heightCm} cm`);
      if (d.weightKg != null) parts.push(`${d.weightKg} kg`);
      return parts.join(", ") || "No measurements";
    }
    case "supplement":
      return [d.name, d.dose, d.frequency]
        .filter(Boolean)
        .join(" \u00b7 ") as string;
    case "note":
      return (d.text as string) || "";
    default:
      return JSON.stringify(d);
  }
}

export default function HealthRecordUpload({
  childId,
}: {
  childId: string;
}) {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state
  const [type, setType] = useState("blood_work");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Blood work fields
  const [iron, setIron] = useState("");
  const [vitaminD, setVitaminD] = useState("");
  const [calcium, setCalcium] = useState("");
  const [b12, setB12] = useState("");

  // Growth measurement fields
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  // Supplement fields
  const [suppName, setSuppName] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");

  // Note field
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  async function fetchRecords() {
    try {
      const res = await fetch(`/api/child/${childId}/health-record`);
      if (res.ok) {
        setRecords(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setFileUrl(url);
    } catch {
      setMessage({ type: "error", text: "Failed to upload file" });
    } finally {
      setUploading(false);
    }
  }

  function buildData(): Record<string, unknown> {
    switch (type) {
      case "blood_work":
        return {
          ...(iron && { iron: parseFloat(iron) }),
          ...(vitaminD && { vitaminD: parseFloat(vitaminD) }),
          ...(calcium && { calcium: parseFloat(calcium) }),
          ...(b12 && { b12: parseFloat(b12) }),
        };
      case "growth_measurement":
        return {
          ...(height && { heightCm: parseFloat(height) }),
          ...(weight && { weightKg: parseFloat(weight) }),
        };
      case "supplement":
        return { name: suppName, dose, frequency };
      case "note":
        return { text: noteText };
      default:
        return {};
    }
  }

  function resetForm() {
    setType("blood_work");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setFileUrl("");
    setIron("");
    setVitaminD("");
    setCalcium("");
    setB12("");
    setHeight("");
    setWeight("");
    setSuppName("");
    setDose("");
    setFrequency("");
    setNoteText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/child/${childId}/health-record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          date,
          data: buildData(),
          notes: notes || null,
          fileUrl: fileUrl || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: "Record added successfully!" });
      resetForm();
      fetchRecords();
    } catch {
      setMessage({ type: "error", text: "Failed to add record" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Add New Record ── */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">
          Add New Record
        </h3>

        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              {RECORD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Dynamic data fields */}
          {type === "blood_work" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Iron (mg/dL)
                </label>
                <input
                  type="number"
                  step="any"
                  value={iron}
                  onChange={(e) => setIron(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Vitamin D (ng/mL)
                </label>
                <input
                  type="number"
                  step="any"
                  value={vitaminD}
                  onChange={(e) => setVitaminD(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Calcium (mg/dL)
                </label>
                <input
                  type="number"
                  step="any"
                  value={calcium}
                  onChange={(e) => setCalcium(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  B12 (pg/mL)
                </label>
                <input
                  type="number"
                  step="any"
                  value={b12}
                  onChange={(e) => setB12(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {type === "growth_measurement" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="any"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="any"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {type === "supplement" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Supplement Name
                </label>
                <input
                  type="text"
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  placeholder="e.g. Vitamin D3"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Dose
                  </label>
                  <input
                    type="text"
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    placeholder="e.g. 1000 IU"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Frequency
                  </label>
                  <input
                    type="text"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="e.g. Daily"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {type === "note" && (
            <div>
              <label className="mb-1 block text-xs text-gray-500">Note</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                placeholder="Enter your notes..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Additional Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* File upload */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Attach File (optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
            />
            {uploading && (
              <p className="mt-1 text-xs text-gray-500">Uploading...</p>
            )}
            {fileUrl && (
              <p className="mt-1 text-xs text-emerald-600">File attached</p>
            )}
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

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Record"}
          </button>
        </div>
      </div>

      {/* ── History ── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">History</h3>
        {loading ? (
          <p className="text-sm text-gray-500">Loading records...</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-gray-500">No health records yet.</p>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div
                key={record.id}
                className="rounded-lg border border-gray-200 p-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      TYPE_BADGE_CLASSES[record.type] || TYPE_BADGE_CLASSES.note
                    }`}
                  >
                    {RECORD_TYPES.find((t) => t.value === record.type)?.label ||
                      record.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(record.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-700">
                  {summarizeData(record)}
                </p>
                {record.notes && (
                  <p className="mt-1 text-xs text-gray-500">{record.notes}</p>
                )}
                {record.fileUrl && (
                  <a
                    href={record.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-emerald-600 hover:underline"
                  >
                    View attachment
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
