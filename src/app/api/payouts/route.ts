import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { createPayoutSchema } from "@/lib/validation";
import { payStaffForPeriod } from "@/lib/payouts";

export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");

  const payouts = await prisma.payout.findMany({
    where: staffId ? { staffId } : undefined,
    include: { staff: true, _count: { select: { washRecords: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(payouts);
}

/** Pays one washing boy for every COMPLETED, not-yet-paid wash in the given
 * period. See src/lib/payouts.ts for the race-safety details. */
export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = createPayoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { staffId, periodStart, periodEnd, notify } = parsed.data;

  const result = await payStaffForPeriod({
    staffId,
    periodStart,
    periodEnd,
    notify,
    createdById: session!.user.id,
  });

  if (!result.ok) {
    const message =
      result.reason === "STAFF_NOT_FOUND"
        ? "Staff not found"
        : "No completed, unpaid washes found for this boy in that period";
    return NextResponse.json({ error: message }, { status: result.reason === "STAFF_NOT_FOUND" ? 404 : 400 });
  }

  return NextResponse.json(result.payout, { status: 201 });
}
