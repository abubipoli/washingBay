import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";

/** Shows what a payout run would look like without creating it — used by
 * the "Pay" button on the Staff Performance page to show a confirmation
 * total before committing. */
export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!staffId || !from || !to) {
    return NextResponse.json({ error: "staffId, from and to are required" }, { status: 400 });
  }

  const washes = await prisma.washRecord.findMany({
    where: {
      staffId,
      status: "COMPLETED",
      payoutId: null,
      createdAt: { gte: new Date(from), lte: new Date(to) },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalAmount = washes.reduce((sum, w) => sum + Number(w.amountStaff), 0);

  return NextResponse.json({
    washCount: washes.length,
    totalAmount,
    washes,
  });
}
