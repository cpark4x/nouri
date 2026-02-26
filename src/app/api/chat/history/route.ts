import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = (session as any).familyId as string | undefined;
  if (!familyId) {
    return NextResponse.json(
      { error: "No family profile found" },
      { status: 400 },
    );
  }

  const messages = await prisma.chatMessage.findMany({
    where: { familyId },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      userName: m.user?.name ?? undefined,
    })),
  });
}