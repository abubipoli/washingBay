import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";

function toCsvRow(values: (string | number)[]): string {
  return values
    .map((v) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(",");
}

/** Exports wash records for a date range as CSV (opens straight into Excel /
 * Google Sheets) for the "fine report" the owner can review outside the app. */
export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

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
    },
    include: { staff: true },
    orderBy: { createdAt: "asc" },
  });

  const header = [
    "Date",
    "Vehicle Number",
    "Vehicle Make",
    "Service",
    "Washing Boy",
    "Total",
    "Business Cut",
    "Boy Cut",
    "Soap Cut",
    "Status",
  ];
  const rows = washes.map((w) =>
    toCsvRow([
      w.createdAt.toISOString(),
      w.vehiclePlate,
      w.vehicleMake ?? "",
      w.serviceLabel,
      w.staff.name,
      Number(w.totalAmount).toFixed(2),
      Number(w.amountBusiness).toFixed(2),
      Number(w.amountStaff).toFixed(2),
      Number(w.amountSoap).toFixed(2),
      w.status,
    ])
  );

  const csv = [toCsvRow(header), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="washes-${from ?? "all"}-${to ?? "all"}.csv"`,
    },
  });
}
