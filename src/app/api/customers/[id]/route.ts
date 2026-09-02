import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { updateCustomerSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireSession();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = updateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.phone) {
    const existing = await prisma.customer.findUnique({ where: { phone: parsed.data.phone } });
    if (existing && existing.id !== params.id) {
      return NextResponse.json({ error: "A customer with this phone number already exists" }, { status: 409 });
    }
  }

  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
    },
  });

  return NextResponse.json(customer);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireSession();
  if (response) return response;

  await prisma.customer.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
