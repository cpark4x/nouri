"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProfileForm from "@/components/profile/profile-form";
import HealthRecordUpload from "@/components/profile/health-record-upload";
import FoodPreferences from "@/components/profile/food-preferences";

const TABS = ["Profile", "Health Records", "Food Preferences"] as const;
type Tab = (typeof TABS)[number];

interface ChildData {
  id: string;
  name: string;
  photoUrl: string | null;
  heightCm: number | null;
  weightKg: number | null;
  activityProfile: { sports?: { name: string; frequency: string; intensity: string }[] } | null;
  goals: string | null;
}

export default function EditChildPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [child, setChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("Profile");

  useEffect(() => {
    async function fetchChild() {
      try {
        const res = await fetch(`/api/child/${id}`);
        if (!res.ok) throw new Error("Failed to load");
        setChild(await res.json());
      } catch {
        setError("Failed to load child profile");
      } finally {
        setLoading(false);
      }
    }
    fetchChild();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="h-10 rounded-lg bg-gray-100" />
          <div className="space-y-3">
            <div className="h-20 rounded-lg bg-gray-100" />
            <div className="h-12 rounded-lg bg-gray-100" />
            <div className="h-12 rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 text-center">
        <p className="text-red-600">{error || "Child not found"}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 text-sm text-emerald-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/child/${id}`)}
          className="rounded-lg p-1 hover:bg-gray-100"
          aria-label="Back"
        >
          <svg
            className="h-5 w-5 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          Edit {child.name}&apos;s Profile
        </h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Profile" && (
        <ProfileForm
          child={child}
          onUpdate={async () => {
            const res = await fetch(`/api/child/${id}`);
            if (res.ok) setChild(await res.json());
          }}
        />
      )}
      {activeTab === "Health Records" && (
        <HealthRecordUpload childId={id} />
      )}
      {activeTab === "Food Preferences" && (
        <FoodPreferences childId={id} />
      )}
    </div>
  );
}
