import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireOwner } from "@/lib/api-guard";
import { createServiceTypeSchema } from "@/lib/validation";

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const serviceTypes = await prisma.serviceType.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(serviceTypes);
}

export async function POST(req: NextRequest) {
  const { response } = await requireOwner();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = createServiceTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const serviceType = await prisma.serviceType.create({ data: parsed.data });
  return NextResponse.json(serviceType, { status: 201 });
}
