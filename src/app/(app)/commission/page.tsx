import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDailyCommissionBreakdown, startOfDay, endOfDay } from "@/lib/reports";
import { DailyCommissionBoard } from "@/components/DailyCommissionBoard";

export const dynamic = "force-dynamic";

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function parseDay(value: string | undefined): Date {
  if (!value) return new Date();
  const d = new Date(`${value}T12:00:00`); // noon avoids DST/timezone edge cases shifting the date
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default async function DailyCommissionPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const day = parseDay(searchParams.date);
  const from = startOfDay(day);
  const to = endOfDay(day);
  const today = new Date();
  const isToday = isoDay(day) === isoDay(today);

  const [settings, groups, inProgressCount] = await Promise.all([
    prisma.businessSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }),
    getDailyCommissionBreakdown(day),
    // Jobs that exist today but haven't been marked Completed yet — these
    // deliberately don't appear in the payout list below, but a manager who
    // forgot to update status would otherwise just see an empty page and
    // wonder where the day's work went.
    prisma.washRecord.count({
      where: { createdAt: { gte: from, lte: to }, status: { in: ["QUEUED", "WASHING", "DETAILING"] } },
    }),
  ]);

  const currency = settings.currency;
  const dayLabel = day.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const initialGroups = groups.map((g) => ({
    staffId: g.staffId,
    name: g.name,
    phone: g.phone,
    subtotal: g.subtotal,
    items: g.items.map((i) => ({
      washId: i.washId,
      vehiclePlate: i.vehiclePlate,
      serviceLabel: i.serviceLabel,
      time: i.time.toISOString(),
      amount: i.amount,
    })),
  }));

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-stack-lg">
      <div>
        <h2 className="text-display-lg font-display-lg text-on-surface">Daily Commission</h2>
        <p className="text-on-surface-variant mt-1">
          Go through each washing boy's jobs for the day together before paying — this list only ever shows
          completed, not-yet-paid work, so it always matches exactly what a "Pay" click will settle.
        </p>
      </div>

      <div className="flex items-center justify-between bg-surface-container-lowest rounded-xl shadow-level-1 px-4 py-3">
        <Link
          href={`/commission?date=${isoDay(addDays(day, -1))}`}
          className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
          aria-label="Previous day"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </Link>
        <div className="text-center">
          <p className="font-medium text-on-surface">{dayLabel}</p>
          {!isToday && (
            <Link href={`/commission?date=${isoDay(today)}`} className="text-xs text-primary underline">
              Jump to today
            </Link>
          )}
        </div>
        <Link
          href={`/commission?date=${isoDay(addDays(day, 1))}`}
          className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
          aria-label="Next day"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </Link>
      </div>

      {inProgressCount > 0 && (
        <div className="flex items-center gap-3 bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 text-sm">
          <span className="material-symbols-outlined text-warning">info</span>
          <span className="text-on-surface">
            {inProgressCount} wash{inProgressCount === 1 ? " is" : "es are"} still Queueing/Washing/Detailing today —
            they won&rsquo;t show up here until marked <strong>Completed</strong>.
          </span>
          <Link href="/revenue" className="text-primary underline ml-auto whitespace-nowrap">
            Update status →
          </Link>
        </div>
      )}

      <DailyCommissionBoard
        initialGroups={initialGroups}
        currency={currency}
        periodStart={from.toISOString()}
        periodEnd={to.toISOString()}
      />
    </div>
  );
}
