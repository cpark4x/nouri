import { prisma } from "@/lib/db";
import { validateInviteToken, redeemInvite } from "../logic";

// GET /api/family/invite/[token] — validate token (public)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const result = await validateInviteToken(prisma, token);
  if (!result.valid) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ invitedEmail: result.invite?.invitedEmail ?? null });
}

// POST /api/family/invite/[token] — redeem token (public)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: { email?: unknown; password?: unknown; name?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newUser = {
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
    name: String(body.name ?? ""),
  };

  if (!newUser.email || !newUser.password || !newUser.name) {
    return Response.json({ error: "email, password, and name are required" }, { status: 400 });
  }

  const result = await redeemInvite(prisma, token, newUser);
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ success: true }, { status: 201 });
}
