import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chat } from "@/lib/ai/providers/anthropic";
import type { ChatMessage } from "@/lib/ai/types";
import {
  aggregateTodayIntake,
  computeGaps,
  isOnTrack,
  buildSuggestionPrompt,
} from "./logic";

// ── In-memory cache ────────────────────────────────────────────────────────────
// Keyed by `${childId}-${todayDateString}` so a suggestion is generated at most
// once per child per day. Entries from previous days are pruned on each request.
const suggestionCache = new Map<string, string>();

// ── Route ──────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 403 });
  }

  const { id } = await params;

  // ── Today's date string for cache key ─────────────────────────────────────
  const today = new Date();
  const todayDateString = today.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const cacheKey = `${id}-${todayDateString}`;

  // Prune stale entries from previous days to keep memory bounded
  for (const key of suggestionCache.keys()) {
    if (!key.endsWith(`-${todayDateString}`)) {
      suggestionCache.delete(key);
    }
  }

  // Return cached suggestion if available
  if (suggestionCache.has(cacheKey)) {
    return NextResponse.json({ suggestion: suggestionCache.get(cacheKey) });
  }

  // ── Fetch child with today's meal logs ────────────────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let child;
  try {
    child = await prisma.child.findUnique({
      where: { id },
      include: {
        dailyTargets: true,
        mealLogs: {
          where: { date: { gte: todayStart, lte: todayEnd } },
          include: { nutrients: true },
        },
      },
    });
  } catch (error) {
    console.error("Database error fetching suggestion data for child:", error);
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

  // ── Compute intake and gaps ────────────────────────────────────────────────
  const intakeMap = aggregateTodayIntake(child.mealLogs);

  // Find calorie target and today's calorie intake
  const calorieTargetEntry = child.dailyTargets.find(
    (t) => t.nutrient === "calories",
  );
  const calorieTarget = calorieTargetEntry?.target ?? 0;
  const calorieIntake = intakeMap["calories"] ?? 0;

  // If child is on track (< 30% calories remaining), no suggestion needed
  if (isOnTrack(calorieTarget, calorieIntake)) {
    return NextResponse.json({ suggestion: null });
  }

  // Find top 2 nutrient gaps
  const gaps = computeGaps(child.dailyTargets, intakeMap);
  if (gaps.length === 0) {
    return NextResponse.json({ suggestion: null });
  }

  // ── Compute age ────────────────────────────────────────────────────────────
  const birthDate = child.dateOfBirth;
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  // ── Build prompt and call AI ───────────────────────────────────────────────
  const prompt = buildSuggestionPrompt(
    child.name,
    age,
    gaps.slice(0, 2),
    calorieIntake,
    calorieTarget,
  );

  const messages: ChatMessage[] = [{ role: "user", content: prompt }];
  const systemPrompt = "You are Nouri, a friendly pediatric nutrition assistant.";

  let suggestion: string;
  try {
    const response = await chat(messages, systemPrompt);
    suggestion = response.content.trim();
  } catch (error) {
    console.error("AI error generating daily suggestion:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 },
    );
  }

  // ── Cache and return ───────────────────────────────────────────────────────
  suggestionCache.set(cacheKey, suggestion);
  return NextResponse.json({ suggestion });
}
