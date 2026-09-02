import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-guard";
import { payStaffForPeriod } from "@/lib/payouts";
import { getStaffPerformanceForPeriod } from "@/lib/reports";

const payAllSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  notify: z.enum(["SMS", "RECEIPT_PRINT", "NONE"]).default("NONE"),
});

/**
 * End-of-day convenience: pays every washing boy who has an outstanding
 * balance in the given period, one at a time. Each individual payout still
 * goes through the same race-safe claim logic as paying one boy — this just
 * loops it across everyone with money owed, so closing out the day doesn't
 * mean clicking "Pay" once per boy.
 */
export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = payAllSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { periodStart, periodEnd, notify } = parsed.data;

  const rows = await getStaffPerformanceForPeriod(periodStart, periodEnd);
  const owed = rows.filter((r) => r.pendingPayout > 0);

  const results: { staffId: string; name: string; amount: number; ok: boolean; payoutId?: string; error?: string }[] =
    [];

  for (const row of owed) {
    const result = await payStaffForPeriod({
      staffId: row.staffId,
      periodStart,
      periodEnd,
      notify,
      createdById: session!.user.id,
    });
    results.push({
      staffId: row.staffId,
      name: row.name,
      amount: result.ok ? Number(result.payout.totalAmount) : 0,
      ok: result.ok,
      payoutId: result.ok ? result.payout.id : undefined,
      error: result.ok ? undefined : result.reason,
    });
  }

  return NextResponse.json({
    paidCount: results.filter((r) => r.ok).length,
    totalPaid: results.reduce((sum, r) => sum + (r.ok ? r.amount : 0), 0),
    results,
  });
}
