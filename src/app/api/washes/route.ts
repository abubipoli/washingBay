import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { createWashSchema } from "@/lib/validation";
import type { WashStatus } from "@prisma/client";

const WASH_STATUSES: WashStatus[] = ["QUEUED", "WASHING", "DETAILING", "COMPLETED", "CANCELLED"];
function parseWashStatus(value: string | null): WashStatus | undefined {
  return WASH_STATUSES.find((s) => s === value);
}

export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const staffId = searchParams.get("staffId");
  const status = parseWashStatus(searchParams.get("status"));
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  const washes = await prisma.washRecord.findMany({
    where: {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(staffId ? { staffId } : {}),
      ...(status ? { status } : {}),
    },
    include: { staff: true, serviceType: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(washes);
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = createWashSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const staff = await prisma.staff.findUnique({ where: { id: data.staffId } });
  if (!staff || !staff.active) {
    return NextResponse.json({ error: "Selected washing boy is not available" }, { status: 400 });
  }

  const wash = await prisma.washRecord.create({
    data: {
      vehiclePlate: data.vehiclePlate.toUpperCase(),
      vehicleMake: data.vehicleMake || null,
      vehicleType: data.vehicleType,
      serviceLabel: data.serviceLabel,
      serviceTypeId: data.serviceTypeId ?? null,
      staffId: data.staffId,
      totalAmount: data.totalAmount,
      amountBusiness: data.amountBusiness,
      amountStaff: data.amountStaff,
      amountSoap: data.amountSoap,
      notes: data.notes || null,
      recordedById: session!.user.id,
    },
    include: { staff: true, serviceType: true },
  });

  return NextResponse.json(wash, { status: 201 });
}
