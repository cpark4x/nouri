import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ai } from "@/lib/ai/router";
import { buildNouriSystemPrompt } from "@/lib/ai/nouri-system-prompt";
import type { ChatMessage } from "@/lib/ai/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session as any).userId as string | undefined;
  const familyId = (session as any).familyId as string | undefined;
  if (!familyId) {
    return NextResponse.json(
      { error: "No family profile found" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const message = body.message as string | undefined;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 },
    );
  }

  const systemPrompt = await buildNouriSystemPrompt(familyId);

  // Load last 20 messages for conversation context
  const recentMessages = await prisma.chatMessage.findMany({
    where: { familyId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const history: ChatMessage[] = recentMessages
    .reverse()
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const aiMessages: ChatMessage[] = [
    ...history,
    { role: "user", content: message.trim() },
  ];

  const response = await ai.chat(aiMessages, systemPrompt);

  // Save both messages to the database
  await prisma.chatMessage.createMany({
    data: [
      {
        familyId,
        userId: userId ?? null,
        role: "user",
        content: message.trim(),
      },
      {
        familyId,
        userId: null,
        role: "assistant",
        content: response.content,
        metadata: response.actions
          ? (JSON.parse(JSON.stringify({ actions: response.actions })) as object)
          : undefined,
      },
    ],
  });

  return NextResponse.json({
    content: response.content,
    actions: response.actions,
  });
}