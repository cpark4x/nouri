import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chat } from "@/lib/ai/providers/anthropic";
import type { ChatMessage } from "@/lib/ai/types";
import { calculateNutrientPercents, buildTipPrompt } from "./logic";

// ── In-memory cache ───────────────────────────────────────────────────────────
// Keyed by mealLogId — tip is generated at most once per meal per server
// process lifetime.  Capped at TIP_CACHE_MAX entries; the oldest entry is
// evicted when the limit is reached (Map preserves insertion order).
const TIP_CACHE_MAX = 500;
const tipCache = new Map<string, string>();

// ── AI call constants ─────────────────────────────────────────────────────────
// Bail out early rather than holding the connection open if Anthropic is slow.
const TIP_TIMEOUT_MS = 15_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age--;
  }
  return age;
}

function buildActivitySummary(activityProfile: unknown): string {
  if (!activityProfile || typeof activityProfile !== "object") {
    return "no specific sports listed";
  }
  const profile = activityProfile as {
    sports?: { name: string; frequency?: string; intensity?: string }[];
  };
  if (!Array.isArray(profile.sports) || profile.sports.length === 0) {
    return "no specific sports listed";
  }
  return profile.sports
    .map((s) => {
      const parts: string[] = [s.name];
      if (s.frequency) parts.push(s.frequency);
      if (s.intensity) parts.push(`${s.intensity} intensity`);
      return parts.join(", ");
    })
    .join("; ");
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mealLogId: string }> },
) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 403 });
  }

  const { mealLogId } = await params;

  // ── Cache check ───────────────────────────────────────────────────────────
  const cached = tipCache.get(mealLogId);
  if (cached) {
    return NextResponse.json({ tip: cached });
  }

  // ── Fetch meal log ────────────────────────────────────────────────────────
  let mealLog;
  try {
    mealLog = await prisma.mealLog.findUnique({
      where: { id: mealLogId },
      include: {
        nutrients: true,
        child: { include: { dailyTargets: true } },
      },
    });
  } catch (error) {
    console.error("Database error fetching meal log for tip:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!mealLog) {
    return NextResponse.json({ error: "Meal log not found" }, { status: 404 });
  }

  // ── Authorization: meal must belong to the requesting family ──────────────
  if (mealLog.child.familyId !== familyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── Build nutrient context ────────────────────────────────────────────────
  const percents = calculateNutrientPercents(
    mealLog.nutrients,
    mealLog.child.dailyTargets,
  );

  const nutrientLines = Object.entries(percents)
    .map(([name, np]) => {
      const percentStr =
        np.percent != null ? ` (${np.percent}% of daily target)` : "";
      return `- ${name}: ${Math.round(np.amount)} ${np.unit}${percentStr}`;
    })
    .join("\n");

  // ── Build prompt ──────────────────────────────────────────────────────────
  const child = mealLog.child;
  const age = calculateAge(child.dateOfBirth);
  const activitySummary = buildActivitySummary(child.activityProfile);

  const userMessage = buildTipPrompt(
    child.name,
    age,
    activitySummary,
    mealLog.description,
    nutrientLines,
  );

  const systemPrompt =
    "You are Nouri, a friendly and knowledgeable pediatric nutrition assistant.";

  const messages: ChatMessage[] = [{ role: "user", content: userMessage }];

  // ── Call AI (with timeout) ────────────────────────────────────────────────
  let tip: string;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("tip_timeout")),
        TIP_TIMEOUT_MS,
      ),
    );
    const response = await Promise.race([chat(messages, systemPrompt), timeoutPromise]);
    tip = response.content.trim();
  } catch (error) {
    const isTimeout =
      error instanceof Error && error.message === "tip_timeout";
    if (isTimeout) {
      console.warn("AI tip generation timed out for mealLogId:", mealLogId);
      return NextResponse.json(
        { error: "Tip generation timed out — try again shortly" },
        { status: 503 },
      );
    }
    console.error("AI error generating meal tip:", error);
    return NextResponse.json(
      { error: "Failed to generate tip" },
      { status: 500 },
    );
  }

  // ── Cache (with size cap) and return ──────────────────────────────────────
  if (tipCache.size >= TIP_CACHE_MAX) {
    // Map.keys() iterates in insertion order — first key is the oldest entry.
    const oldestKey = tipCache.keys().next().value;
    if (oldestKey !== undefined) tipCache.delete(oldestKey);
  }
  tipCache.set(mealLogId, tip);
  return NextResponse.json({ tip });
}
