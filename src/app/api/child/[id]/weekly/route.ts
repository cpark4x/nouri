import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildDateRange,
  aggregateIntakeByDate,
  buildDays,
  calculateWeeklyStats,
} from "./logic";

export async function GET(
  request: NextRequest,
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

  // ── Date window ───────────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  // Parse the requested end date; default to today.
  const endDate = dateParam ? new Date(dateParam) : new Date();
  // Extend to end-of-day so all logs on that date are included.
  endDate.setHours(23, 59, 59, 999);

  // Start date is 6 days earlier at midnight.
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  // ── Fetch child + targets ─────────────────────────────────────────────────
  const { id } = await params;

  const child = await prisma.child.findUnique({
    where: { id },
    include: {
      dailyTargets: true,
      mealLogs: {
        where: {
          date: { gte: startDate, lte: endDate },
        },
        include: { nutrients: true },
      },
    },
  });

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Authorisation: child must belong to the session's family.
  if (child.familyId !== familyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Build targets map ─────────────────────────────────────────────────────
  const targets: Record<string, { target: number; unit: string }> = {};
  for (const dt of child.dailyTargets) {
    targets[dt.nutrient] = { target: dt.target, unit: dt.unit };
  }

  // ── Aggregate + shape response ────────────────────────────────────────────
  const intakeMap = aggregateIntakeByDate(child.mealLogs);
  const dateRange = buildDateRange(endDate);
  const days = buildDays(dateRange, intakeMap, targets);
  const { weeklyAverages, weeklyAveragePercent } = calculateWeeklyStats(
    days,
    targets,
  );

  return NextResponse.json({
    child: {
      id: child.id,
      name: child.name,
      targets,
    },
    days,
    weeklyAverages,
    weeklyAveragePercent,
  });
}
