import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createInviteToken } from "./logic";

// POST /api/family/invite — create an invite link (auth required)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.familyId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // body is optional — no email pre-fill is fine
  }

  const token = await createInviteToken(prisma, {
    familyId: session.familyId,
    invitedEmail: body.email ? String(body.email) : undefined,
  });

  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${base}/auth/invite/${token}`;

  return Response.json({ inviteUrl }, { status: 201 });
}
