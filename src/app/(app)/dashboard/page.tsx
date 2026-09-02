import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBusinessSummary, getRevenueTrend, rangeBounds, type ReportRange } from "@/lib/reports";
import { formatMoney } from "@/lib/money";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { RevenueTrendChart } from "@/components/RevenueTrendChart";

export const dynamic = "force-dynamic";

const EXPENSE_COLORS: Record<string, string> = {
  ELECTRICITY: "bg-warning",
  WATER: "bg-info",
  SOAP_CHEMICALS: "bg-[#8B5CF6]",
  MAINTENANCE: "bg-outline",
  SALARY: "bg-tertiary",
  RENT: "bg-secondary",
  OTHER: "bg-on-surface-variant",
};
const EXPENSE_LABELS: Record<string, string> = {
  ELECTRICITY: "Electricity",
  WATER: "Water Bill",
  SOAP_CHEMICALS: "Soap & Chemicals",
  MAINTENANCE: "Maintenance",
  SALARY: "Salary",
  RENT: "Rent",
  OTHER: "Other",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range: ReportRange = searchParams.range === "week" ? "week" : searchParams.range === "month" ? "month" : "day";
  const anchor = new Date();

  const [summary, trend, settings, recentWashes] = await Promise.all([
    getBusinessSummary(range, anchor),
    getRevenueTrend(14),
    prisma.businessSettings.findUnique({ where: { id: "default" } }),
    prisma.washRecord.findMany({
      where: { createdAt: { gte: rangeBounds(range, anchor).from, lte: rangeBounds(range, anchor).to } },
      include: { staff: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const currency = settings?.currency ?? "GHS";
  const { from, to } = rangeBounds(range, anchor);
  const maxExpense = Math.max(...summary.expensesByCategory.map((e) => e.amount), 1);

  const rangeLabel = { day: "Today", week: "This Week", month: "This Month" }[range];
  const dateLabel = anchor.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-stack-lg">
        <div>
          <h2 className="text-display-lg font-display-lg text-on-surface">Overview</h2>
          <p className="text-on-surface-variant mt-1">Today is {dateLabel}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex bg-surface-container-lowest rounded-lg border border-outline-variant p-1 shadow-ambient-sm">
            {(["day", "week", "month"] as const).map((r) => (
              <Link
                key={r}
                href={`/dashboard?range=${r}`}
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
            className="px-4 py-2 bg-surface-container-highest text-on-surface rounded-lg text-label-caps font-label-caps flex items-center gap-2 hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export
          </a>
        </div>
      </div>

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
        <div className="col-span-1 md:col-span-2 bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute right-0 top-0 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
              <span className="text-label-caps font-label-caps">Total Revenue ({rangeLabel})</span>
            </div>
            {summary.revenueChangePct !== null && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-label-caps font-label-caps ${
                  summary.revenueChangePct >= 0 ? "text-success bg-success/10" : "text-error bg-error-container"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {summary.revenueChangePct >= 0 ? "arrow_upward" : "arrow_downward"}
                </span>
                {Math.abs(summary.revenueChangePct).toFixed(1)}%
              </div>
            )}
          </div>
          <div className="mt-4 relative z-10">
            <div className="text-[36px] font-display-lg font-bold text-on-surface leading-none mb-1">
              {formatMoney(summary.revenue, currency)}
            </div>
            <p className="text-data-tabular font-data-tabular text-on-surface-variant">
              {summary.washCount} wash{summary.washCount === 1 ? "" : "es"} recorded
            </p>
          </div>
        </div>

        <KpiCard
          icon="monitoring"
          iconColorClass="text-tertiary"
          label="Net Profit"
          value={formatMoney(summary.netProfit, currency)}
          sublabel={`${summary.margin.toFixed(0)}% margin`}
        />

        <KpiCard
          icon="groups"
          iconColorClass="text-secondary"
          label="Active Boys"
          value={`${summary.staffOnShiftCount} / ${summary.activeStaffCount}`}
          sublabel={`${rangeLabel === "Today" ? "On Shift Today" : `Active ${rangeLabel}`}`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-stack-lg">
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-headline-md font-headline-md">Business Progress (14 days)</h3>
          </div>
          <RevenueTrendChart data={trend} />
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-headline-md font-headline-md">Expenses ({rangeLabel})</h3>
            <span className="text-data-tabular font-data-tabular text-error bg-error-container px-2 py-1 rounded-md">
              {formatMoney(summary.expenses, currency)}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-4">
            {summary.expensesByCategory.length === 0 && (
              <p className="text-on-surface-variant text-body-md">No expenses recorded for this period.</p>
            )}
            {summary.expensesByCategory.map((e) => (
              <div key={e.category}>
                <div className="flex justify-between text-data-tabular font-data-tabular mb-1">
                  <span className="text-on-surface-variant">{EXPENSE_LABELS[e.category]}</span>
                  <span className="font-medium text-on-surface">{formatMoney(e.amount, currency)}</span>
                </div>
                <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${EXPENSE_COLORS[e.category]}`}
                    style={{ width: `${Math.max((e.amount / maxExpense) * 100, 4)}%` }}
                  />
                </div>
              </div>
            ))}
            <Link
              href="/settings"
              className="mt-auto text-primary hover:text-primary-fixed-dim text-label-caps font-label-caps font-medium transition-colors"
            >
              Manage expenses →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-level-1 overflow-hidden">
        <div className="p-card-padding border-b border-outline-variant/30 flex justify-between items-center bg-surface-bright/50">
          <h3 className="text-headline-md font-headline-md">{rangeLabel}&rsquo;s Washes</h3>
          <Link href="/revenue" className="text-primary hover:text-primary-fixed-dim text-label-caps font-label-caps font-medium transition-colors">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-caps text-label-caps">
                <th className="py-3 px-6 font-medium">Vehicle / Time</th>
                <th className="py-3 px-6 font-medium">Assigned Boy</th>
                <th className="py-3 px-6 font-medium">Service Type</th>
                <th className="py-3 px-6 font-medium">Status</th>
                <th className="py-3 px-6 font-medium">Total ({currency})</th>
                <th className="py-3 px-6 font-medium text-primary">Business</th>
                <th className="py-3 px-6 font-medium">Washing Boy</th>
                <th className="py-3 px-6 font-medium text-tertiary">Soap</th>
              </tr>
            </thead>
            <tbody className="text-data-tabular font-data-tabular">
              {recentWashes.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 px-6 text-center text-on-surface-variant">
                    No washes recorded yet.{" "}
                    <Link href="/revenue?action=new" className="text-primary font-medium">
                      Record the first one →
                    </Link>
                  </td>
                </tr>
              )}
              {recentWashes.map((w) => (
                <tr key={w.id} className="border-b border-outline-variant/20 hover:bg-surface-bright transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-medium text-on-surface">{w.vehiclePlate}</div>
                    <div className="text-xs text-on-surface-variant">
                      {w.createdAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  <td className="py-4 px-6 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-[10px] font-bold">
                      {w.staff.name.slice(0, 1)}
                    </div>
                    {w.staff.name}
                  </td>
                  <td className="py-4 px-6">{w.serviceLabel}</td>
                  <td className="py-4 px-6">
                    <StatusBadge status={w.status} />
                  </td>
                  <td className="py-4 px-6 font-medium text-on-surface">{formatMoney(w.totalAmount, currency)}</td>
                  <td className="py-4 px-6 text-primary">{formatMoney(w.amountBusiness, currency)}</td>
                  <td className="py-4 px-6">{formatMoney(w.amountStaff, currency)}</td>
                  <td className="py-4 px-6 text-tertiary">{formatMoney(w.amountSoap, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
