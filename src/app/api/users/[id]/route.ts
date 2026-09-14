import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/api-guard";
import { updateUserSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, response } = await requireOwner();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Changing your own role or active status through this panel is how an
  // owner accidentally locks themselves out — do it from My Profile instead
  // (name/password only there), never here.
  if (params.id === session!.user.id && (parsed.data.role !== undefined || parsed.data.active !== undefined)) {
    return NextResponse.json({ error: "You can't change your own role or active status here" }, { status: 400 });
  }

  // Never let the last active owner get demoted or deactivated — that
  // would leave nobody able to manage users, staff pricing, or payouts.
  const losingOwnerAccess =
    existing.role === "OWNER" &&
    existing.active &&
    ((parsed.data.role !== undefined && parsed.data.role !== "OWNER") || parsed.data.active === false);
  if (losingOwnerAccess) {
    const activeOwners = await prisma.user.count({ where: { role: "OWNER", active: true } });
    if (activeOwners <= 1) {
      return NextResponse.json({ error: "There must be at least one active owner account" }, { status: 400 });
    }
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      ...(parsed.data.password ? { passwordHash: await bcrypt.hash(parsed.data.password, 12) } : {}),
    },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json(user);
}
