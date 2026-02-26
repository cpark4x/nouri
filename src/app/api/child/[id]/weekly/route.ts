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

  // Validate format and calendar value if a date param was supplied.
  if (dateParam !== null) {
    const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateParam);
    const isValidDate =
      isValidFormat && !isNaN(new Date(dateParam).getTime());
    if (!isValidDate) {
      return NextResponse.json(
        { error: "Invalid date parameter. Expected YYYY-MM-DD format." },
        { status: 400 },
      );
    }
  }

  // Use the provided date or today's UTC date as the inclusive end of the window.
  const endDateStr = dateParam ?? new Date().toISOString().slice(0, 10);

  // Build UTC-anchored boundaries so the Prisma range query matches the UTC
  // dates used by aggregateIntakeByDate.
  const endDate = new Date(`${endDateStr}T23:59:59.999Z`);
  const startDate = new Date(`${endDateStr}T00:00:00.000Z`);
  startDate.setUTCDate(startDate.getUTCDate() - 6);

  // ── Fetch child + targets ─────────────────────────────────────────────────
  const { id } = await params;

  let child;
  try {
    child = await prisma.child.findUnique({
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
  } catch (error) {
    console.error("Database error fetching weekly data for child:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

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
  const dateRange = buildDateRange(endDateStr);
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
