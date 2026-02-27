import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const existing = await prisma.kitchenItem.findUnique({ where: { id } });
  if (!existing || existing.familyId !== familyId) {
    return NextResponse.json(
      { error: "Kitchen item not found" },
      { status: 404 },
    );
  }

  await prisma.kitchenItem.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
