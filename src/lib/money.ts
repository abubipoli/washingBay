import type { Prisma } from "@prisma/client";

/**
 * Split-calculation helpers.
 *
 * The three-way split (business / staff / soap) is stored as explicit
 * amounts, not recomputed percentages, because managers routinely override
 * it for one-off jobs (e.g. "blowing" is only ever split business/staff,
 * with no soap leg). These helpers exist so every entry point — the record
 * form, the API validator, and seed data — computes a default split the
 * same way, while still allowing the final amounts to be overridden.
 */

export type Split = {
  business: number;
  staff: number;
  soap: number;
};

/** Rounds to 2dp using standard half-up rounding for currency amounts. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Distributes `total` across business/staff/soap using percentages that are
 * allowed to sum to less than 100 (e.g. a 2-way split leaves soap at 0), but
 * never more. Any rounding remainder is assigned to the business share so
 * amountBusiness + amountStaff + amountSoap always reconciles exactly to
 * `total` — this invariant is what the API validates on write.
 */
export function computeDefaultSplit(
  total: number,
  businessPct: number,
  staffPct: number,
  soapPct: number
): Split {
  const staff = roundMoney((total * staffPct) / 100);
  const soap = roundMoney((total * soapPct) / 100);
  const business = roundMoney(total - staff - soap);
  return { business, staff, soap };
}

export function splitSumsToTotal(split: Split, total: number): boolean {
  return roundMoney(split.business + split.staff + split.soap) === roundMoney(total);
}

export function toNumber(value: Prisma.Decimal | number | string): number {
  return typeof value === "object" ? value.toNumber() : Number(value);
}

const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(value: Prisma.Decimal | number | string, currency = "GHS"): string {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      minimumFractionDigits: 2,
    });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(toNumber(value));
}
