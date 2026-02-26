import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chat } from "@/lib/ai/providers/anthropic";
import type { ChatMessage } from "@/lib/ai/types";
import {
  buildDateRange,
  aggregateIntakeByDate,
  buildDays,
  calculateWeeklyStats,
} from "../weekly/logic";

// ── In-memory cache ────────────────────────────────────────────────────────────
// Keyed by `${childId}-${weekStart}` (Monday ISO date) so insight is generated
// at most once per child per week.
const insightCache = new Map<string, { insight: string; generatedAt: string }>();

// ── 6 primary nutrients shown in the prompt ────────────────────────────────────
const PRIMARY_NUTRIENTS = [
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein" },
  { key: "calcium", label: "Calcium" },
  { key: "vitaminD", label: "Vitamin D" },
  { key: "iron", label: "Iron" },
  { key: "zinc", label: "Zinc" },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

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

/** Returns the ISO date string (YYYY-MM-DD) of the Monday of the given UTC date. */
function getMondayOfWeek(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Converts activityProfile JSON into a readable summary string for the prompt. */
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

// ── Route ──────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const { id } = await params;

  // ── Cache check ───────────────────────────────────────────────────────────
  const today = new Date();
  const weekStart = getMondayOfWeek(today);
  const cacheKey = `${id}-${weekStart}`;
  const cached = insightCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // ── Date window — same pattern as /weekly ─────────────────────────────────
  const endDateStr = today.toISOString().slice(0, 10);
  const endDate = new Date(`${endDateStr}T23:59:59.999Z`);
  const startDate = new Date(`${endDateStr}T00:00:00.000Z`);
  startDate.setUTCDate(startDate.getUTCDate() - 6);

  // ── Fetch child ───────────────────────────────────────────────────────────
  let child;
  try {
    child = await prisma.child.findUnique({
      where: { id },
      include: {
        dailyTargets: true,
        mealLogs: {
          where: { date: { gte: startDate, lte: endDate } },
          include: { nutrients: true },
        },
      },
    });
  } catch (error) {
    console.error("Database error fetching insight data for child:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  if (child.familyId !== familyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Compute weekly averages ───────────────────────────────────────────────
  const targets: Record<string, { target: number; unit: string }> = {};
  for (const dt of child.dailyTargets) {
    targets[dt.nutrient] = { target: dt.target, unit: dt.unit };
  }

  const intakeMap = aggregateIntakeByDate(child.mealLogs);
  const dateRange = buildDateRange(endDateStr);
  const days = buildDays(dateRange, intakeMap, targets);
  const { weeklyAveragePercent } = calculateWeeklyStats(days, targets);

  // ── Build prompt ──────────────────────────────────────────────────────────
  const age = calculateAge(child.dateOfBirth);
  const activitySummary = buildActivitySummary(child.activityProfile);

  const nutrientLines = PRIMARY_NUTRIENTS.map(({ key, label }) => {
    const percent = weeklyAveragePercent[key] ?? 0;
    return `- ${label}: ${percent}% of daily target`;
  }).join("\n");

  const systemPrompt =
    "You are Nouri, a pediatric nutrition assistant for the Park family.";

  const userMessage =
    `Child: ${child.name}, ${age} years old, ${activitySummary}\n\n` +
    `Here is their nutrition data for the past 7 days (% of daily target):\n` +
    `${nutrientLines}\n\n` +
    `Write a 2-3 sentence weekly insight that is:\n` +
    `- Specific (use the child's name and actual numbers)\n` +
    `- Positive (lead with what went well — at least one thing)\n` +
    `- Actionable (name the biggest gap and give ONE concrete food suggestion to fix it)\n` +
    `- Conversational (no bullet points, no headers, just plain sentences)`;

  const messages: ChatMessage[] = [{ role: "user", content: userMessage }];

  // ── Call AI ───────────────────────────────────────────────────────────────
  let insight: string;
  try {
    const response = await chat(messages, systemPrompt);
    insight = response.content;
  } catch (error) {
    console.error("AI error generating weekly insight:", error);
    return NextResponse.json(
      { error: "Failed to generate insight" },
      { status: 500 },
    );
  }

  // ── Cache and return ──────────────────────────────────────────────────────
  const result = { insight, generatedAt: new Date().toISOString() };
  insightCache.set(cacheKey, result);
  return NextResponse.json(result);
}
