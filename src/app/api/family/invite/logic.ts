import type { PrismaClient } from "@/generated/prisma/client";
import { hashPassword } from "../../auth/register/logic";

export interface InviteCreateInput {
  familyId: string;
  invitedEmail?: string;
}

export interface InviteValidationResult {
  valid: boolean;
  error?: "not_found" | "expired" | "already_used";
  invite?: { familyId: string; invitedEmail: string | null };
}

/**
 * Creates a FamilyInvite record with a 48-hour expiry.
 * Returns the token string.
 */
export async function createInviteToken(
  prisma: PrismaClient,
  input: InviteCreateInput,
): Promise<string> {
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const invite = await prisma.familyInvite.create({
    data: {
      familyId: input.familyId,
      invitedEmail: input.invitedEmail ?? null,
      expiresAt,
    },
  });
  return invite.token;
}

/**
 * Validates a token. Returns status without consuming it.
 */
export async function validateInviteToken(
  prisma: PrismaClient,
  token: string,
): Promise<InviteValidationResult> {
  const invite = await prisma.familyInvite.findUnique({ where: { token } });

  if (!invite) {
    return { valid: false, error: "not_found" };
  }
  if (invite.usedAt !== null) {
    return { valid: false, error: "already_used" };
  }
  if (invite.expiresAt < new Date()) {
    return { valid: false, error: "expired" };
  }

  return {
    valid: true,
    invite: { familyId: invite.familyId, invitedEmail: invite.invitedEmail },
  };
}

/**
 * Redeems a token: creates the new User + links to Family in a transaction.
 * Marks token as used. Returns error if token invalid/expired/used.
 */
export async function redeemInvite(
  prisma: PrismaClient,
  token: string,
  newUser: { email: string; password: string; name: string },
): Promise<{ success: boolean; error?: string }> {
  const validation = await validateInviteToken(prisma, token);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const familyId = validation.invite!.familyId;

  const existing = await prisma.user.findUnique({
    where: { email: newUser.email },
  });
  if (existing) {
    return { success: false, error: "email_taken" };
  }

  const passwordHash = await hashPassword(newUser.password);

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        email: newUser.email,
        name: newUser.name.trim(),
        passwordHash,
        familyId,
      },
    });
    await tx.familyInvite.update({
      where: { token },
      data: { usedAt: new Date() },
    });
  });

  return { success: true };
}
