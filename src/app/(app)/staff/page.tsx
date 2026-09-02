import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getStaffPerformance, rangeBounds, type ReportRange } from "@/lib/reports";
import { formatMoney } from "@/lib/money";
import { PayoutPanel } from "@/components/PayoutPanel";
import { PayAllButton } from "@/components/PayAllButton";

export const dynamic = "force-dynamic";

export default async function StaffPerformancePage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range: ReportRange = searchParams.range === "week" ? "week" : searchParams.range === "month" ? "month" : "day";
  const anchor = new Date();
  const { from, to } = rangeBounds(range, anchor);

  const [rows, settings, recentPayouts] = await Promise.all([
    getStaffPerformance(range, anchor),
    prisma.businessSettings.findUnique({ where: { id: "default" } }),
    prisma.payout.findMany({
      include: { staff: true, _count: { select: { washRecords: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const currency = settings?.currency ?? "GHS";

  const totals = rows.reduce(
    (acc, r) => ({
      washCount: acc.washCount + r.washCount,
      grossRevenue: acc.grossRevenue + r.grossRevenue,
      pendingPayout: acc.pendingPayout + r.pendingPayout,
    }),
    { washCount: 0, grossRevenue: 0, pendingPayout: 0 }
  );

  const leaderboard = [...rows].sort((a, b) => b.washCount - a.washCount).slice(0, 5);
  const rangeLabel = { day: "Today", week: "This Week", month: "This Month" }[range];

  return (
    <div className="max-w-7xl mx-auto space-y-stack-lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-stack-md">
        <div>
          <h2 className="text-display-lg font-display-lg text-on-surface">Staff Performance</h2>
          <p className="text-body-lg font-body-lg text-on-surface-variant mt-1">
            Track washes, revenue generated, and pay washing boys transparently.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-surface-container-lowest rounded-lg border border-outline-variant p-1 shadow-ambient-sm">
            {(["day", "week", "month"] as const).map((r) => (
              <Link
                key={r}
                href={`/staff?range=${r}`}
                className={`px-4 py-1.5 rounded-md font-label-caps text-label-caps transition-colors ${
                  range === r ? "bg-secondary-container text-primary" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {{ day: "Today", week: "This Week", month: "This Month" }[r]}
              </Link>
            ))}
          </div>
          <a
            href={`/api/reports/export?from=${from.toISOString()}&to=${to.toISOString()}`}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface-variant hover:text-primary hover:border-primary transition-colors shadow-ambient-sm"
          >
            <span className="material-symbols-outlined">download</span>
            Export
          </a>
        </div>
      </div>

      {/* Always mounted (not gated on pendingPayout > 0): PayAllButton needs
          to stay alive after a successful payout — brings pendingPayout to
          0 — so its "Paid N boys" confirmation and receipt links don't get
          unmounted out from under the user the instant the page refreshes. */}
      <div className="flex justify-end">
        <PayAllButton
          totalOwed={totals.pendingPayout}
          currency={currency}
          periodStart={from.toISOString()}
          periodEnd={to.toISOString()}
          rangeLabel={rangeLabel}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Leaderboard */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl shadow-ambient-sm border border-outline-variant flex flex-col h-full overflow-hidden">
          <div className="p-card-padding border-b border-outline-variant flex justify-between items-center bg-surface-bright">
            <h3 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">emoji_events</span>
              Leaderboard
            </h3>
          </div>
          <div className="p-card-padding flex-1 bg-surface-container-lowest">
            {leaderboard.length === 0 && (
              <p className="text-on-surface-variant text-body-md">No washes recorded for this period yet.</p>
            )}
            <ul className="space-y-4">
              {leaderboard.map((r, i) => (
                <li
                  key={r.staffId}
                  className={`flex items-center gap-4 p-3 rounded-lg relative overflow-hidden ${
                    i === 0 ? "bg-surface-bright border border-outline-variant" : "hover:bg-surface-bright transition-colors"
                  }`}
                >
                  {i === 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-body-md ${
                      i === 0 ? "bg-primary-container text-on-primary" : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant flex items-center justify-center font-bold text-on-surface-variant">
                    {r.name.slice(0, 1)}
                  </div>
                  <div className="flex-1">
                    <p className="text-body-md font-headline-md text-on-surface font-semibold">{r.name}</p>
                    <p className="text-label-caps font-label-caps text-on-surface-variant">{r.washCount} Washes</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-body-md font-headline-md font-bold ${i === 0 ? "text-primary" : "text-on-surface"}`}>
                      {formatMoney(r.grossRevenue, currency)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payout Report */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-ambient-sm border border-outline-variant overflow-hidden flex flex-col h-full">
          <div className="p-card-padding border-b border-outline-variant flex justify-between items-center bg-surface-bright">
            <h3 className="text-headline-md font-headline-md text-on-surface">Payout Report</h3>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-tertiary" />
              <span className="text-label-caps font-label-caps text-on-surface-variant">
                Split amounts recorded per wash
              </span>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="py-3 px-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Staff Member</th>
                  <th className="py-3 px-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider text-right">Washes</th>
                  <th className="py-3 px-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider text-right">Gross Rev</th>
                  <th className="py-3 px-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider text-right">Paid</th>
                  <th className="py-3 px-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-on-surface-variant">
                      No activity in this period.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.staffId} className="hover:bg-surface-bright transition-colors h-[56px]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary-container text-primary flex items-center justify-center font-headline-md text-sm font-bold">
                          {initials(r.name)}
                        </div>
                        <span className="text-body-md font-body-md text-on-surface font-semibold">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-data-tabular font-data-tabular text-on-surface text-right">{r.washCount}</td>
                    <td className="py-3 px-4 text-data-tabular font-data-tabular text-on-surface text-right">
                      {formatMoney(r.grossRevenue, currency)}
                    </td>
                    <td className="py-3 px-4 text-data-tabular font-data-tabular text-primary font-bold text-right">
                      {formatMoney(r.paidThisPeriod, currency)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <PayoutPanel
                        staffId={r.staffId}
                        pendingPayout={r.pendingPayout}
                        currency={currency}
                        periodStart={from.toISOString()}
                        periodEnd={to.toISOString()}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-container-low border-t border-outline-variant">
                <tr>
                  <td className="py-4 px-4 text-body-md font-headline-md text-on-surface font-bold">Totals</td>
                  <td className="py-4 px-4 text-data-tabular font-data-tabular text-on-surface font-bold text-right">{totals.washCount}</td>
                  <td className="py-4 px-4 text-data-tabular font-data-tabular text-on-surface font-bold text-right">
                    {formatMoney(totals.grossRevenue, currency)}
                  </td>
                  <td className="py-4 px-4 text-data-tabular font-data-tabular text-primary font-bold text-right text-lg">
                    {formatMoney(totals.pendingPayout, currency)} owed
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Payment history */}
      <div className="bg-surface-container-lowest rounded-xl shadow-ambient-sm border border-outline-variant overflow-hidden">
        <div className="p-card-padding border-b border-outline-variant bg-surface-bright">
          <h3 className="text-headline-md font-headline-md text-on-surface">Recent Payments</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Every past payout, with a receipt listing the exact vehicles it covered.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="py-3 px-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Date Paid</th>
                <th className="py-3 px-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Washing Boy</th>
                <th className="py-3 px-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider text-right">Washes</th>
                <th className="py-3 px-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider text-right">Amount</th>
                <th className="py-3 px-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">Notified</th>
                <th className="py-3 px-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {recentPayouts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-on-surface-variant">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
              {recentPayouts.map((p) => (
                <tr key={p.id} className="hover:bg-surface-bright transition-colors h-[56px]">
                  <td className="py-3 px-4 text-data-tabular font-data-tabular">
                    {(p.paidAt ?? p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">{p.staff.name}</td>
                  <td className="py-3 px-4 text-data-tabular font-data-tabular text-right">{p.washCount}</td>
                  <td className="py-3 px-4 text-data-tabular font-data-tabular text-primary font-bold text-right">
                    {formatMoney(p.totalAmount, currency)}
                  </td>
                  <td className="py-3 px-4 text-xs text-on-surface-variant">
                    {p.notifiedChannel === "SMS" ? "SMS sent" : p.notifiedChannel === "RECEIPT_PRINT" ? "Receipt printed" : "—"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link href={`/receipt/payout/${p.id}`} className="text-primary text-xs font-medium hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
