import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { createStaffSchema } from "@/lib/validation";

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const staff = await prisma.staff.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.staff.findUnique({ where: { phone: parsed.data.phone } });
  if (existing) {
    return NextResponse.json({ error: "A staff member with this phone number already exists" }, { status: 409 });
  }

  const staff = await prisma.staff.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      photoUrl: parsed.data.photoUrl || null,
    },
  });

  return NextResponse.json(staff, { status: 201 });
}
