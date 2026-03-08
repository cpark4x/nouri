"use client";

import { useState } from "react";

interface GeneratedInvite {
  inviteUrl: string;
  generatedAt: number; // Date.now()
}

function msToHoursMinutes(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 1000 / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  if (minutes === 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

const EXPIRES_MS = 48 * 60 * 60 * 1000;

export default function InvitePartner() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<GeneratedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/family/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to generate invite link.");
        return;
      }

      setInvite({ inviteUrl: data.inviteUrl, generatedAt: Date.now() });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
    }
  }

  const expiresIn = invite
    ? msToHoursMinutes(EXPIRES_MS - (Date.now() - invite.generatedAt))
    : null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Invite a family member
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Generate a one-time link so your partner can join your family and see
          the same kids, meals, and data.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!invite ? (
        <form onSubmit={handleGenerate} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Partner's email (optional)"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-60 whitespace-nowrap"
          >
            {loading ? "Generating…" : "Generate invite link"}
          </button>
        </form>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={invite.inviteUrl}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 whitespace-nowrap"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Expires in {expiresIn} &middot; One-time use only
          </p>

          <button
            type="button"
            onClick={() => {
              setInvite(null);
              setEmail("");
            }}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            Generate a new link
          </button>
        </div>
      )}
    </section>
  );
}
