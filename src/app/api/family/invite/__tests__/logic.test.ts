/**
 * Unit tests for family invite logic.
 * Prisma is injected — no @/ alias needed, no DB required.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createInviteToken,
  validateInviteToken,
  redeemInvite,
} from "../logic";

// ---------------------------------------------------------------------------
// Minimal prisma mock types
// ---------------------------------------------------------------------------
type MockInvite = {
  id: string;
  token: string;
  familyId: string;
  invitedEmail: string | null;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
};

function makePrismaMock(invites: MockInvite[] = [], users: { email: string }[] = []) {
  const inviteStore = [...invites];
  const userStore = [...users];

  return {
    familyInvite: {
      create: vi.fn(async ({ data }: { data: Partial<MockInvite> }) => {
        const record: MockInvite = {
          id: "inv_" + Math.random().toString(36).slice(2),
          token: "tok_" + Math.random().toString(36).slice(2),
          familyId: data.familyId ?? "fam1",
          invitedEmail: data.invitedEmail ?? null,
          createdAt: new Date(),
          expiresAt: data.expiresAt ?? new Date(Date.now() + 48 * 60 * 60 * 1000),
          usedAt: null,
        };
        inviteStore.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { token: string } }) => {
        return inviteStore.find((i) => i.token === where.token) ?? null;
      }),
      update: vi.fn(async ({ where, data }: { where: { token: string }; data: Partial<MockInvite> }) => {
        const idx = inviteStore.findIndex((i) => i.token === where.token);
        if (idx !== -1) {
          inviteStore[idx] = { ...inviteStore[idx], ...data };
          return inviteStore[idx];
        }
        throw new Error("Record not found");
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email: string } }) => {
        return userStore.find((u) => u.email === where.email) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: { email: string; name: string; passwordHash: string; familyId: string } }) => {
        const user = { id: "usr_" + Math.random().toString(36).slice(2), ...data };
        userStore.push(user);
        return user;
      }),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      // Run the transaction callback with the same mock (simplified)
      return fn({
        user: {
          create: vi.fn(async ({ data }: { data: { email: string; name: string; passwordHash: string; familyId: string } }) => {
            const user = { id: "usr_" + Math.random().toString(36).slice(2), ...data };
            userStore.push(user);
            return user;
          }),
        },
        familyInvite: {
          update: vi.fn(async ({ where, data }: { where: { token: string }; data: Partial<MockInvite> }) => {
            const idx = inviteStore.findIndex((i) => i.token === where.token);
            if (idx !== -1) {
              inviteStore[idx] = { ...inviteStore[idx], ...data };
              return inviteStore[idx];
            }
            throw new Error("Record not found");
          }),
        },
      });
    }),
    // Expose for test assertions
    _inviteStore: inviteStore,
    _userStore: userStore,
  };
}

// ---------------------------------------------------------------------------
// createInviteToken
// ---------------------------------------------------------------------------
describe("createInviteToken", () => {
  it("creates an invite record and returns the token", async () => {
    const prisma = makePrismaMock() as unknown as Parameters<typeof createInviteToken>[0];
    const token = await createInviteToken(prisma, { familyId: "fam1" });
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("stores the invitedEmail when provided", async () => {
    const prisma = makePrismaMock() as unknown as Parameters<typeof createInviteToken>[0];
    await createInviteToken(prisma, { familyId: "fam1", invitedEmail: "wife@example.com" });
    expect(prisma.familyInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ invitedEmail: "wife@example.com" }),
      }),
    );
  });

  it("sets expiresAt ~48h in the future", async () => {
    const before = Date.now();
    const prisma = makePrismaMock() as unknown as Parameters<typeof createInviteToken>[0];
    await createInviteToken(prisma, { familyId: "fam1" });
    const call = (prisma.familyInvite.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const expiresAt: Date = call.data.expiresAt;
    const diffMs = expiresAt.getTime() - before;
    expect(diffMs).toBeGreaterThanOrEqual(48 * 60 * 60 * 1000 - 1000);
    expect(diffMs).toBeLessThanOrEqual(48 * 60 * 60 * 1000 + 1000);
  });
});

// ---------------------------------------------------------------------------
// validateInviteToken
// ---------------------------------------------------------------------------
describe("validateInviteToken", () => {
  it("returns not_found for unknown token", async () => {
    const prisma = makePrismaMock() as unknown as Parameters<typeof validateInviteToken>[0];
    const result = await validateInviteToken(prisma, "nonexistent-token");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("not_found");
  });

  it("returns expired for a token past its expiry", async () => {
    const expiredInvite: MockInvite = {
      id: "inv1",
      token: "expired-token",
      familyId: "fam1",
      invitedEmail: null,
      createdAt: new Date(Date.now() - 49 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      usedAt: null,
    };
    const prisma = makePrismaMock([expiredInvite]) as unknown as Parameters<typeof validateInviteToken>[0];
    const result = await validateInviteToken(prisma, "expired-token");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("expired");
  });

  it("returns already_used for a consumed token", async () => {
    const usedInvite: MockInvite = {
      id: "inv2",
      token: "used-token",
      familyId: "fam1",
      invitedEmail: null,
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 47 * 60 * 60 * 1000),
      usedAt: new Date(Date.now() - 30 * 60 * 1000), // used 30 min ago
    };
    const prisma = makePrismaMock([usedInvite]) as unknown as Parameters<typeof validateInviteToken>[0];
    const result = await validateInviteToken(prisma, "used-token");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("already_used");
  });

  it("returns valid for a fresh, unused token", async () => {
    const validInvite: MockInvite = {
      id: "inv3",
      token: "good-token",
      familyId: "fam1",
      invitedEmail: "wife@example.com",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      usedAt: null,
    };
    const prisma = makePrismaMock([validInvite]) as unknown as Parameters<typeof validateInviteToken>[0];
    const result = await validateInviteToken(prisma, "good-token");
    expect(result.valid).toBe(true);
    expect(result.invite?.familyId).toBe("fam1");
    expect(result.invite?.invitedEmail).toBe("wife@example.com");
  });
});

// ---------------------------------------------------------------------------
// redeemInvite
// ---------------------------------------------------------------------------
describe("redeemInvite", () => {
  let validInvite: MockInvite;

  beforeEach(() => {
    validInvite = {
      id: "inv4",
      token: "redeem-token",
      familyId: "fam1",
      invitedEmail: "wife@example.com",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      usedAt: null,
    };
  });

  it("creates a new user linked to the family", async () => {
    const prisma = makePrismaMock([validInvite]) as unknown as Parameters<typeof redeemInvite>[0] & { _userStore: { email: string; familyId?: string }[] };
    const result = await redeemInvite(prisma, "redeem-token", {
      email: "wife@example.com",
      password: "password123",
      name: "Jane",
    });
    expect(result.success).toBe(true);
    const createdUser = prisma._userStore.find((u) => u.email === "wife@example.com");
    expect(createdUser).toBeDefined();
    expect((createdUser as { familyId?: string }).familyId).toBe("fam1");
  });

  it("marks the token as used after redemption", async () => {
    const prisma = makePrismaMock([validInvite]) as unknown as Parameters<typeof redeemInvite>[0] & { _inviteStore: MockInvite[] };
    await redeemInvite(prisma, "redeem-token", {
      email: "wife@example.com",
      password: "password123",
      name: "Jane",
    });
    const stored = prisma._inviteStore.find((i) => i.token === "redeem-token");
    expect(stored?.usedAt).not.toBeNull();
  });

  it("rejects a second redemption of the same (already-used) token", async () => {
    const usedInvite: MockInvite = { ...validInvite, usedAt: new Date(Date.now() - 1000) };
    const prisma = makePrismaMock([usedInvite]) as unknown as Parameters<typeof redeemInvite>[0];
    const result = await redeemInvite(prisma, "redeem-token", {
      email: "wife2@example.com",
      password: "password123",
      name: "Jane",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("already_used");
  });

  it("rejects when the token is expired", async () => {
    const expiredInvite: MockInvite = {
      ...validInvite,
      expiresAt: new Date(Date.now() - 1000),
    };
    const prisma = makePrismaMock([expiredInvite]) as unknown as Parameters<typeof redeemInvite>[0];
    const result = await redeemInvite(prisma, "redeem-token", {
      email: "wife@example.com",
      password: "password123",
      name: "Jane",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("expired");
  });

  it("rejects when the email is already taken", async () => {
    const existingUser = { email: "wife@example.com" };
    const prisma = makePrismaMock([validInvite], [existingUser]) as unknown as Parameters<typeof redeemInvite>[0];
    const result = await redeemInvite(prisma, "redeem-token", {
      email: "wife@example.com",
      password: "password123",
      name: "Jane",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("email_taken");
  });

  it("returns not_found for an unknown token", async () => {
    const prisma = makePrismaMock() as unknown as Parameters<typeof redeemInvite>[0];
    const result = await redeemInvite(prisma, "ghost-token", {
      email: "wife@example.com",
      password: "password123",
      name: "Jane",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("not_found");
  });
});
