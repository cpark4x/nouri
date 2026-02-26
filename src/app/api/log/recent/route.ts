import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const familyId = (session as any).familyId as string | undefined;
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("childId");
  if (!childId) {
    return NextResponse.json(
      { error: "childId is required" },
      { status: 400 },
    );
  }

  // Verify child belongs to family
  const child = await prisma.child.findUnique({
    where: { id: childId },
  });

  if (!child || child.familyId !== familyId) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Query last 50 meal logs for deduplication pool
  const recentLogs = await prisma.mealLog.findMany({
    where: { childId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      nutrients: {
        select: { nutrient: true, amount: true, unit: true },
      },
    },
  });

  // Deduplicate by description (case-insensitive, trimmed).
  // Keep the most recent entry and count occurrences.
  const seen = new Map<
    string,
    {
      description: string;
      mealType: string;
      lastLoggedAt: Date;
      count: number;
      nutrients: { nutrient: string; amount: number; unit: string }[];
    }
  >();

  for (const log of recentLogs) {
    const key = log.description.trim().toLowerCase();
    const existing = seen.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      seen.set(key, {
        description: log.description,
        mealType: log.mealType,
        lastLoggedAt: log.createdAt,
        count: 1,
        nutrients: log.nutrients,
      });
    }
  }

  // Sort by frequency desc, then recency desc. Return top 10.
  const meals = Array.from(seen.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastLoggedAt.getTime() - a.lastLoggedAt.getTime();
    })
    .slice(0, 10)
    .map(({ lastLoggedAt, ...rest }) => ({
      ...rest,
      lastLoggedAt: lastLoggedAt.toISOString(),
    }));

  return NextResponse.json({ meals });
}