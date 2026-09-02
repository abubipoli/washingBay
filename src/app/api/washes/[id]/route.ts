import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireOwner } from "@/lib/api-guard";
import { updateWashStatusSchema, createWashSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireSession();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = updateWashStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.washRecord.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Wash record not found" }, { status: 404 });
  }
  if (existing.payoutId) {
    return NextResponse.json(
      { error: "This wash has already been paid out and can no longer be changed" },
      { status: 409 }
    );
  }
  // Completed is final: it's what feeds the boy's commission total, so it
  // can't be flipped to Cancelled or anything else afterward. Re-sending
  // "COMPLETED" again is harmless and allowed (a no-op), only a change away
  // from it is blocked.
  if (existing.status === "COMPLETED" && parsed.data.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "This wash is marked Completed and can no longer change status" },
      { status: 409 }
    );
  }

  const wash = await prisma.washRecord.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      completedAt: parsed.data.status === "COMPLETED" ? new Date() : existing.completedAt,
    },
    include: { staff: true, serviceType: true },
  });

  return NextResponse.json(wash);
}

/**
 * Full edit of a wash record — vehicle, service, staff, amounts, notes.
 * Owner-only ("high access" per the business's own request) since this can
 * rewrite financial history for a job; also locked once paid out, same as
 * the status-only PATCH above, so a record that's already been settled with
 * a washing boy can't be altered afterwards either.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireOwner();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = createWashSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.washRecord.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Wash record not found" }, { status: 404 });
  }
  if (existing.payoutId) {
    return NextResponse.json(
      { error: "This wash has already been paid out and can no longer be edited" },
      { status: 409 }
    );
  }

  const staff = await prisma.staff.findUnique({ where: { id: data.staffId } });
  if (!staff || !staff.active) {
    return NextResponse.json({ error: "Selected washing boy is not available" }, { status: 400 });
  }

  const wash = await prisma.washRecord.update({
    where: { id: params.id },
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
    },
    include: { staff: true, serviceType: true },
  });

  return NextResponse.json(wash);
}

/**
 * Deletes a wash record outright — for genuine mistakes (wrong vehicle,
 * duplicate entry), not routine cleanup. Owner-only, same "high access" tier
 * as editing, and blocked once paid out for the same reason: a paid record
 * is the audit trail behind a real commission payment and must stay intact.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireOwner();
  if (response) return response;

  const existing = await prisma.washRecord.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Wash record not found" }, { status: 404 });
  }
  if (existing.payoutId) {
    return NextResponse.json(
      { error: "This wash has already been paid out and can no longer be deleted" },
      { status: 409 }
    );
  }

  await prisma.washRecord.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireSession();
  if (response) return response;

  const wash = await prisma.washRecord.findUnique({
    where: { id: params.id },
    include: { staff: true, serviceType: true, recordedBy: true },
  });
  if (!wash) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wash);
}
