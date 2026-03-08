"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type PageState =
  | { status: "loading" }
  | { status: "error"; code: "not_found" | "expired" | "already_used" | "unknown" }
  | { status: "ready"; invitedEmail: string | null };

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "This invite link is invalid or doesn't exist.",
  expired: "This invite link has expired. Ask your family member to generate a new one.",
  already_used: "This invite link has already been used. Ask your family member to generate a new one.",
  unknown: "Something went wrong. Please try again.",
};

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Validate the token on mount
  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/family/invite/${token}`);
        const data = await res.json();
        if (!res.ok) {
          const code =
            data.error === "not_found" ||
            data.error === "expired" ||
            data.error === "already_used"
              ? data.error
              : "unknown";
          setPageState({ status: "error", code });
        } else {
          setEmail(data.invitedEmail ?? "");
          setPageState({ status: "ready", invitedEmail: data.invitedEmail });
        }
      } catch {
        setPageState({ status: "error", code: "unknown" });
      }
    }
    validate();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/family/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg =
          data.error === "email_taken"
            ? "An account with this email already exists."
            : data.error === "already_used"
              ? "This invite has already been used."
              : data.error === "expired"
                ? "This invite has expired."
                : data.error ?? "Something went wrong.";
        setFormError(msg);
        return;
      }

      router.push("/auth/signin?invited=true");
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Loading ---
  if (pageState.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking your invite…</p>
      </div>
    );
  }

  // --- Error ---
  if (pageState.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Invite link unavailable
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            {ERROR_MESSAGES[pageState.code] ?? ERROR_MESSAGES.unknown}
          </p>
          <Link
            href="/auth/signin"
            className="inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  // --- Ready: show registration form ---
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">👨‍👩‍👧</div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Join your family on Nouri
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Create an account to track your kids&apos; nutrition together.
          </p>
        </div>

        {formError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Your name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Create account & join family"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700"
          >
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
