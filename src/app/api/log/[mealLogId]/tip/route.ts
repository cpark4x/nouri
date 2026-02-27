import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chat } from "@/lib/ai/providers/anthropic";
import type { ChatMessage } from "@/lib/ai/types";
import { calculateNutrientPercents, buildTipPrompt } from "./logic";

// ── In-memory cache ──────────────────────────────────────────────────────────
// Keyed by mealLogId — tip is generated at most once per meal per server
// process lifetime.
const tipCache = new Map<string, string>();

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Route ────────────────────────────────────────────────────────────────────

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

  // ── Build nutrient context ─────────────────────────────────────────────────
  const percents = calculateNutrientPercents(
    mealLog.nutrients,
    mealLog.child.dailyTargets,
  );

  const nutrientLines = Object.entries(percents)
    .map(([, np]) => {
      const percentStr =
        np.percent != null ? ` (${np.percent}% of daily target)` : "";
      return `- ${Math.round(np.amount)} ${np.unit}${percentStr}`;
    })
    .join("\n");

  // ── Build prompt ───────────────────────────────────────────────────────────
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

  // ── Call AI ────────────────────────────────────────────────────────────────
  let tip: string;
  try {
    const response = await chat(messages, systemPrompt);
    tip = response.content.trim();
  } catch (error) {
    console.error("AI error generating meal tip:", error);
    return NextResponse.json(
      { error: "Failed to generate tip" },
      { status: 500 },
    );
  }

  // ── Cache and return ───────────────────────────────────────────────────────
  tipCache.set(mealLogId, tip);
  return NextResponse.json({ tip });
}
