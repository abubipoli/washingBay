import { prisma } from "@/lib/prisma";

export type ReportRange = "day" | "week" | "month";

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1; // week starts Monday
  x.setDate(x.getDate() - diff);
  return x;
}
function endOfWeek(d: Date) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  return endOfDay(x);
}

export function rangeBounds(range: ReportRange, anchor: Date) {
  const from = range === "month" ? startOfMonth(anchor) : range === "week" ? startOfWeek(anchor) : startOfDay(anchor);
  const to = range === "month" ? endOfMonth(anchor) : range === "week" ? endOfWeek(anchor) : endOfDay(anchor);
  return { from, to };
}

/**
 * Net profit = Revenue − Staff payouts (amountStaff) − Expenses.
 * The "soap" split is informational only (see WashRecord docs) and isn't
 * subtracted again since actual soap spend already lives in Expenses.
 */
export async function getBusinessSummaryForPeriod(from: Date, to: Date) {
  const [washAgg, expenseAgg, activeStaffCount, staffOnShift, previousPeriodAgg, expensesByCategory] =
    await Promise.all([
      prisma.washRecord.aggregate({
        where: { createdAt: { gte: from, lte: to }, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true, amountBusiness: true, amountStaff: true, amountSoap: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: { date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      prisma.staff.count({ where: { active: true } }),
      prisma.washRecord.findMany({
        where: { createdAt: { gte: from, lte: to } },
        distinct: ["staffId"],
        select: { staffId: true },
      }),
      (() => {
        const spanMs = to.getTime() - from.getTime();
        const prevFrom = new Date(from.getTime() - spanMs - 1);
        const prevTo = new Date(from.getTime() - 1);
        return prisma.washRecord.aggregate({
          where: { createdAt: { gte: prevFrom, lte: prevTo }, status: { not: "CANCELLED" } },
          _sum: { totalAmount: true },
        });
      })(),
      prisma.expense.groupBy({
        by: ["category"],
        where: { date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
    ]);

  const revenue = Number(washAgg._sum.totalAmount ?? 0);
  const staffPayoutsDue = Number(washAgg._sum.amountStaff ?? 0);
  const soapAllocated = Number(washAgg._sum.amountSoap ?? 0);
  const businessCut = Number(washAgg._sum.amountBusiness ?? 0);
  const expenses = Number(expenseAgg._sum.amount ?? 0);
  const netProfit = revenue - staffPayoutsDue - expenses;
  const previousRevenue = Number(previousPeriodAgg._sum.totalAmount ?? 0);
  const revenueChangePct = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : null;

  return {
    from,
    to,
    revenue,
    washCount: washAgg._count,
    businessCut,
    staffPayoutsDue,
    soapAllocated,
    expenses,
    netProfit,
    margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    revenueChangePct,
    activeStaffCount,
    staffOnShiftCount: staffOnShift.length,
    expensesByCategory: expensesByCategory.map((e) => ({
      category: e.category,
      amount: Number(e._sum.amount ?? 0),
    })),
  };
}

export async function getBusinessSummary(range: ReportRange, anchor: Date) {
  const { from, to } = rangeBounds(range, anchor);
  const summary = await getBusinessSummaryForPeriod(from, to);
  return { ...summary, range };
}

export type StaffPerformanceRow = {
  staffId: string;
  name: string;
  phone: string;
  photoUrl: string | null;
  washCount: number;
  grossRevenue: number;
  pendingPayout: number;
  paidThisPeriod: number;
};

/**
 * Per-staff numbers for the Staff Performance page: how many washes, gross
 * revenue attributed to them, what's still owed (completed washes not yet
 * attached to a Payout), and what's already been paid out in this window.
 */
export async function getStaffPerformanceForPeriod(from: Date, to: Date): Promise<StaffPerformanceRow[]> {
  const [activeStaff, washGroups, pendingGroups, paidGroups] = await Promise.all([
    prisma.staff.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.washRecord.groupBy({
      by: ["staffId"],
      where: { createdAt: { gte: from, lte: to }, status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.washRecord.groupBy({
      by: ["staffId"],
      where: { createdAt: { gte: from, lte: to }, status: "COMPLETED", payoutId: null },
      _sum: { amountStaff: true },
    }),
    prisma.payout.groupBy({
      by: ["staffId"],
      where: { createdAt: { gte: from, lte: to } },
      _sum: { totalAmount: true },
    }),
  ]);

  const washByStaff = new Map(washGroups.map((g) => [g.staffId, g]));
  const pendingByStaff = new Map(pendingGroups.map((g) => [g.staffId, Number(g._sum.amountStaff ?? 0)]));
  const paidByStaff = new Map(paidGroups.map((g) => [g.staffId, Number(g._sum.totalAmount ?? 0)]));

  // A washing boy who was deactivated after this period still needs to show
  // up here if there's money tied to their name, so the payout report never
  // silently drops someone who's owed — fetch anyone referenced above who
  // isn't already in the active-staff list.
  const activeIds = new Set(activeStaff.map((s) => s.id));
  const referencedIds = new Set([
    ...washByStaff.keys(),
    ...pendingByStaff.keys(),
    ...paidByStaff.keys(),
  ]);
  const missingIds = [...referencedIds].filter((id) => !activeIds.has(id));
  const inactiveStaff = missingIds.length
    ? await prisma.staff.findMany({ where: { id: { in: missingIds } } })
    : [];
  const staffList = [...activeStaff, ...inactiveStaff];

  const rows = staffList.map((s) => {
    const washAgg = washByStaff.get(s.id);
    return {
      staffId: s.id,
      name: s.name,
      phone: s.phone,
      photoUrl: s.photoUrl,
      washCount: washAgg?._count ?? 0,
      grossRevenue: Number(washAgg?._sum.totalAmount ?? 0),
      pendingPayout: pendingByStaff.get(s.id) ?? 0,
      paidThisPeriod: paidByStaff.get(s.id) ?? 0,
    };
  });

  return rows
    .filter((r) => r.washCount > 0 || r.pendingPayout > 0 || r.paidThisPeriod > 0)
    .sort((a, b) => b.grossRevenue - a.grossRevenue);
}

export async function getStaffPerformance(range: ReportRange, anchor: Date): Promise<StaffPerformanceRow[]> {
  const { from, to } = rangeBounds(range, anchor);
  return getStaffPerformanceForPeriod(from, to);
}

export type CommissionItem = {
  washId: string;
  vehiclePlate: string;
  serviceLabel: string;
  time: Date;
  amount: number;
};
export type StaffCommissionGroup = {
  staffId: string;
  name: string;
  phone: string;
  items: CommissionItem[];
  subtotal: number;
};

/**
 * Itemized, job-by-job commission owed per washing boy for one day — the
 * "check the list with the boy before paying" workflow. Only COMPLETED,
 * not-yet-paid washes count, same eligibility rule as an actual payout, so
 * what's shown here is always exactly what a "Pay" click would settle.
 */
export async function getDailyCommissionBreakdown(day: Date): Promise<StaffCommissionGroup[]> {
  const from = startOfDay(day);
  const to = endOfDay(day);

  const washes = await prisma.washRecord.findMany({
    where: { createdAt: { gte: from, lte: to }, status: "COMPLETED", payoutId: null },
    include: { staff: true },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, StaffCommissionGroup>();
  for (const w of washes) {
    let group = groups.get(w.staffId);
    if (!group) {
      group = { staffId: w.staffId, name: w.staff.name, phone: w.staff.phone, items: [], subtotal: 0 };
      groups.set(w.staffId, group);
    }
    const amount = Number(w.amountStaff);
    group.items.push({
      washId: w.id,
      vehiclePlate: w.vehiclePlate,
      serviceLabel: w.serviceLabel,
      time: w.createdAt,
      amount,
    });
    group.subtotal += amount;
  }

  return Array.from(groups.values()).sort((a, b) => b.subtotal - a.subtotal);
}

export async function getRevenueTrend(days: number) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const washes = await prisma.washRecord.findMany({
    where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
    select: { createdAt: true, totalAmount: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const w of washes) {
    const key = w.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + Number(w.totalAmount));
  }

  return Array.from(buckets.entries()).map(([date, revenue]) => ({ date, revenue }));
}
