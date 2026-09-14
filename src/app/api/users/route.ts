import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/api-guard";
import { createUserSchema } from "@/lib/validation";

/** Owner-only: who can sign in, and as what role. Listing and creating both
 * require an owner — a manager has no reason to see or add accounts. */
export async function GET() {
  const { response } = await requireOwner();
  if (response) return response;

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { response } = await requireOwner();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
