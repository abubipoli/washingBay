import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBusinessSummaryForPeriod, getStaffPerformanceForPeriod } from "@/lib/reports";
import { formatMoney } from "@/lib/money";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const EXPENSE_LABELS: Record<string, string> = {
  ELECTRICITY: "Electricity",
  WATER: "Water Bill",
  SOAP_CHEMICALS: "Soap & Chemicals",
  MAINTENANCE: "Maintenance",
  SALARY: "Salary",
  RENT: "Rent",
  OTHER: "Other",
};

function parseDateParam(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default async function PrintableReportPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const now = new Date();
  const from = parseDateParam(searchParams.from, new Date(now.getFullYear(), now.getMonth(), 1));
  from.setHours(0, 0, 0, 0);
  const to = parseDateParam(searchParams.to, now);
  to.setHours(23, 59, 59, 999);

  const [settings, summary, staffRows, washes, expenses, payouts] = await Promise.all([
    prisma.businessSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }),
    getBusinessSummaryForPeriod(from, to),
    getStaffPerformanceForPeriod(from, to),
    prisma.washRecord.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { staff: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
      include: { recordedBy: { select: { name: true } } },
      orderBy: { date: "asc" },
    }),
    // Actual payout transactions in the period — the audit trail behind the
    // "Paid This Period" column in Staff Performance below: who was paid,
    // when, how much, how they were notified, and which vehicles it covered.
    prisma.payout.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { staff: true, washRecords: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totalCommissionPaid = payouts.reduce((sum, p) => sum + Number(p.totalAmount), 0);

  const currency = settings.currency;
  const periodLabel = `${from.toLocaleDateString()} – ${to.toLocaleDateString()}`;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="no-print max-w-4xl mx-auto flex justify-between items-center mb-4">
        <Link href="/reports" className="text-primary text-sm font-medium">← Back to Reports</Link>
        <PrintButton label="Print / Save as PDF" />
      </div>

      <div className="print-receipt max-w-4xl mx-auto bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding">
        <div className="text-center mb-8 border-b border-outline-variant pb-6">
          <h1 className="text-display-lg font-display-lg text-primary">{settings.businessName}</h1>
          {settings.address && <p className="text-sm text-on-surface-variant">{settings.address}</p>}
          {settings.phone && <p className="text-sm text-on-surface-variant">{settings.phone}</p>}
          <p className="text-label-caps font-label-caps text-on-surface-variant mt-3">BUSINESS REPORT</p>
          <p className="text-body-md text-on-surface mt-1">{periodLabel}</p>
        </div>

        {/* Summary */}
        <h2 className="text-headline-md font-headline-md mb-3">Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 text-sm">
          <SummaryStat label="Total Revenue" value={formatMoney(summary.revenue, currency)} />
          <SummaryStat label="Washes Recorded" value={String(summary.washCount)} />
          <SummaryStat label="Business Cut" value={formatMoney(summary.businessCut, currency)} />
          <SummaryStat label="Staff Payouts" value={formatMoney(summary.staffPayoutsDue, currency)} />
          <SummaryStat label="Soap Allocated" value={formatMoney(summary.soapAllocated, currency)} />
          <SummaryStat label="Expenses" value={formatMoney(summary.expenses, currency)} />
          <SummaryStat label="Net Profit" value={formatMoney(summary.netProfit, currency)} highlight />
          <SummaryStat label="Margin" value={`${summary.margin.toFixed(1)}%`} />
        </div>

        {/* Expenses */}
        <h2 className="text-headline-md font-headline-md mb-3">Expenses</h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-on-surface-variant mb-8">No expenses recorded in this period.</p>
        ) : (
          <table className="w-full text-sm border-collapse mb-8">
            <thead>
              <tr className="bg-surface-container-low text-left">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Note</th>
                <th className="py-2 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-outline-variant/30">
                  <td className="py-2 px-3">{e.date.toLocaleDateString()}</td>
                  <td className="py-2 px-3">{EXPENSE_LABELS[e.category] ?? e.category}</td>
                  <td className="py-2 px-3">{e.description ?? "—"}</td>
                  <td className="py-2 px-3 text-right">{formatMoney(e.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Staff performance */}
        <h2 className="text-headline-md font-headline-md mb-3">Staff Performance</h2>
        {staffRows.length === 0 ? (
          <p className="text-sm text-on-surface-variant mb-8">No staff activity in this period.</p>
        ) : (
          <table className="w-full text-sm border-collapse mb-8">
            <thead>
              <tr className="bg-surface-container-low text-left">
                <th className="py-2 px-3">Washing Boy</th>
                <th className="py-2 px-3 text-right">Washes</th>
                <th className="py-2 px-3 text-right">Gross Revenue</th>
                <th className="py-2 px-3 text-right">Paid This Period</th>
                <th className="py-2 px-3 text-right">Still Owed</th>
              </tr>
            </thead>
            <tbody>
              {staffRows.map((r) => (
                <tr key={r.staffId} className="border-b border-outline-variant/30">
                  <td className="py-2 px-3">{r.name}</td>
                  <td className="py-2 px-3 text-right">{r.washCount}</td>
                  <td className="py-2 px-3 text-right">{formatMoney(r.grossRevenue, currency)}</td>
                  <td className="py-2 px-3 text-right">{formatMoney(r.paidThisPeriod, currency)}</td>
                  <td className="py-2 px-3 text-right">{formatMoney(r.pendingPayout, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Commission report */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-headline-md font-headline-md">Commission Report</h2>
          <span className="text-sm text-on-surface-variant">
            Total paid out: <strong className="text-on-surface">{formatMoney(totalCommissionPaid, currency)}</strong>
          </span>
        </div>
        {payouts.length === 0 ? (
          <p className="text-sm text-on-surface-variant mb-8">No commission payouts recorded in this period.</p>
        ) : (
          <table className="w-full text-sm border-collapse mb-8">
            <thead>
              <tr className="bg-surface-container-low text-left">
                <th className="py-2 px-3">Date Paid</th>
                <th className="py-2 px-3">Washing Boy</th>
                <th className="py-2 px-3">Vehicles Covered</th>
                <th className="py-2 px-3 text-right">Washes</th>
                <th className="py-2 px-3">Notified</th>
                <th className="py-2 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-outline-variant/30 align-top">
                  <td className="py-2 px-3">{(p.paidAt ?? p.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 px-3">{p.staff.name}</td>
                  <td className="py-2 px-3">{p.washRecords.map((w) => w.vehiclePlate).join(", ")}</td>
                  <td className="py-2 px-3 text-right">{p.washCount}</td>
                  <td className="py-2 px-3">
                    {p.notifiedChannel === "SMS" ? "SMS" : p.notifiedChannel === "RECEIPT_PRINT" ? "Receipt printed" : "—"}
                  </td>
                  <td className="py-2 px-3 text-right font-medium">{formatMoney(p.totalAmount, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-container-low font-medium">
                <td className="py-2 px-3" colSpan={5}>Total</td>
                <td className="py-2 px-3 text-right">{formatMoney(totalCommissionPaid, currency)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* Wash list */}
        <h2 className="text-headline-md font-headline-md mb-3">Wash Records ({washes.length})</h2>
        {washes.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No washes recorded in this period.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-left">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Vehicle</th>
                <th className="py-2 px-3">Service</th>
                <th className="py-2 px-3">Boy</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {washes.map((w) => (
                <tr key={w.id} className="border-b border-outline-variant/30">
                  <td className="py-2 px-3">{w.createdAt.toLocaleDateString()}</td>
                  <td className="py-2 px-3">{w.vehiclePlate}</td>
                  <td className="py-2 px-3">{w.serviceLabel}</td>
                  <td className="py-2 px-3">{w.staff.name}</td>
                  <td className="py-2 px-3">{w.status}</td>
                  <td className="py-2 px-3 text-right">{formatMoney(w.totalAmount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="text-center text-xs text-on-surface-variant mt-10">
          Generated {new Date().toLocaleString()} — {settings.businessName}
        </p>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-primary/10" : "bg-surface-container-low"}`}>
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className={`text-lg font-bold ${highlight ? "text-primary" : "text-on-surface"}`}>{value}</p>
    </div>
  );
}
