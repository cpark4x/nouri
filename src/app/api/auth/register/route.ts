import { prisma } from "@/lib/db";
import { hashPassword, validateRegisterInput } from "./logic";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = {
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
    name: String(body.name ?? ""),
  };

  const validation = validateRegisterInput(input);
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    return Response.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(input.password);

  // Create family + user in a transaction
  await prisma.$transaction(async (tx) => {
    const family = await tx.family.create({
      data: { name: `${input.name.trim()}'s Family` },
    });
    await tx.user.create({
      data: {
        email: input.email,
        name: input.name.trim(),
        passwordHash,
        familyId: family.id,
      },
    });
  });

  return Response.json({ success: true }, { status: 201 });
}
