import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 403 });
  }

  const { id } = await params;

  const child = await prisma.child.findUnique({ where: { id } });
  if (!child || child.familyId !== familyId) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const records = await prisma.healthRecord.findMany({
    where: { childId: id },
    orderBy: { date: "desc" },
    select: {
      id: true,
      type: true,
      date: true,
      data: true,
      notes: true,
      fileUrl: true,
      createdAt: true,
    },
  });

  return NextResponse.json(records);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = session.familyId ?? undefined;
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 403 });
  }

  const { id } = await params;

  const child = await prisma.child.findUnique({ where: { id } });
  if (!child || child.familyId !== familyId) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const body = await request.json();
  const { type, date, data, notes, fileUrl } = body;

  if (!type || !date || !data) {
    return NextResponse.json(
      { error: "type, date, and data are required" },
      { status: 400 }
    );
  }

  const record = await prisma.healthRecord.create({
    data: {
      childId: id,
      type,
      date: new Date(date),
      data,
      notes: notes || null,
      fileUrl: fileUrl || null,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
