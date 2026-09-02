import type { Prisma } from "@prisma/client";
import { formatMoney } from "@/lib/money";

type Money = Prisma.Decimal | number | string;

/** The tripartite revenue-split chips used throughout the app — business
 * (primary/purple), washing boy (grey/outline), soap (teal/tertiary) — per
 * DESIGN.md's "Revenue Split Indicators" component spec.
 *
 * Server-component only: it accepts Prisma.Decimal directly, so don't import
 * this from a "use client" component (Decimal isn't a serializable prop). */
export function SplitChips({
  business,
  staff,
  soap,
  currency = "GHS",
}: {
  business: Money;
  staff: Money;
  soap: Money;
  currency?: string;
}) {
  return (
    <div className="flex gap-1 text-xs" title="Business / Washing Boy / Soap split">
      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded" aria-label="Business share">
        {formatMoney(business, currency)}
      </span>
      <span
        className="bg-surface-container-high text-on-surface px-2 py-0.5 rounded"
        aria-label="Washing boy share"
      >
        {formatMoney(staff, currency)}
      </span>
      <span className="bg-tertiary/10 text-tertiary px-2 py-0.5 rounded" aria-label="Soap share">
        {formatMoney(soap, currency)}
      </span>
    </div>
  );
}
