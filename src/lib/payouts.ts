import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { buildPayoutSmsMessage, getSmsProviderFromSettings } from "@/lib/sms";
import type { Payout, Staff } from "@prisma/client";

export type NotifyChoice = "SMS" | "RECEIPT_PRINT" | "NONE";

export type PayoutResult =
  | { ok: true; payout: Payout & { staff: Staff } }
  | { ok: false; reason: "NO_ELIGIBLE_WASHES" | "STAFF_NOT_FOUND" };

/**
 * Pays one washing boy for every COMPLETED, not-yet-paid wash in the given
 * period, then (optionally) notifies them.
 *
 * Race safety: rather than SELECT-then-UPDATE (which two concurrent "Pay"
 * clicks for the same boy could both pass, double-paying a wash), this
 * creates the Payout row first and then runs a single atomic `updateMany`
 * that claims washes with `payoutId: null` for it. Postgres row-locks the
 * matching rows during that UPDATE, so a second concurrent payout attempt's
 * WHERE `payoutId: null` simply won't match rows the first one just claimed
 * — a wash can never end up attached to two payouts. Totals are computed
 * from whatever was actually claimed, not from the pre-claim read.
 */
export async function payStaffForPeriod(params: {
  staffId: string;
  periodStart: Date;
  periodEnd: Date;
  notify: NotifyChoice;
  createdById: string;
}): Promise<PayoutResult> {
  const { staffId, periodStart, periodEnd, notify, createdById } = params;

  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff) return { ok: false, reason: "STAFF_NOT_FOUND" };

  const payout = await prisma.$transaction(async (tx) => {
    const created = await tx.payout.create({
      data: {
        staffId,
        periodStart,
        periodEnd,
        totalAmount: 0,
        washCount: 0,
        status: "PAID",
        paidAt: new Date(),
        createdById,
      },
    });

    const claim = await tx.washRecord.updateMany({
      where: {
        staffId,
        status: "COMPLETED",
        payoutId: null,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      data: { payoutId: created.id },
    });

    if (claim.count === 0) {
      await tx.payout.delete({ where: { id: created.id } });
      return null;
    }

    const claimedWashes = await tx.washRecord.findMany({ where: { payoutId: created.id } });
    const totalAmount = claimedWashes.reduce((sum, w) => sum + Number(w.amountStaff), 0);

    return tx.payout.update({
      where: { id: created.id },
      data: { totalAmount, washCount: claim.count },
    });
  });

  if (!payout) {
    return { ok: false, reason: "NO_ELIGIBLE_WASHES" };
  }

  let notifiedChannel: NotifyChoice = "NONE";
  if (notify === "SMS") {
    const settings = await prisma.businessSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
    const message = buildPayoutSmsMessage({
      staffName: staff.name,
      amount: formatMoney(payout.totalAmount, settings.currency),
      washCount: payout.washCount,
      periodLabel: periodStart.toLocaleDateString("en-GB"),
      businessName: settings.businessName,
      template: settings.payoutSmsTemplate,
    });
    const result = await getSmsProviderFromSettings(settings).sendSms(staff.phone, message);
    if (result.success) notifiedChannel = "SMS";
  } else if (notify === "RECEIPT_PRINT") {
    notifiedChannel = "RECEIPT_PRINT";
  }

  const updated = await prisma.payout.update({
    where: { id: payout.id },
    data: { notifiedChannel, notifiedAt: notifiedChannel !== "NONE" ? new Date() : null },
    include: { staff: true },
  });

  return { ok: true, payout: updated };
}
