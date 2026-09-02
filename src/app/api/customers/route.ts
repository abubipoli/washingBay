import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { createCustomerSchema } from "@/lib/validation";

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const customers = await prisma.customer.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.customer.findUnique({ where: { phone: parsed.data.phone } });
  if (existing) {
    return NextResponse.json({ error: "A customer with this phone number already exists" }, { status: 409 });
  }

  const customer = await prisma.customer.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      notes: parsed.data.notes || null,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
