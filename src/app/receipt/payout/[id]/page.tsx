import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PayoutReceiptPage({ params }: { params: { id: string } }) {
  const [payout, settings] = await Promise.all([
    prisma.payout.findUnique({
      where: { id: params.id },
      include: { staff: true, washRecords: true, createdBy: true },
    }),
    prisma.businessSettings.findUnique({ where: { id: "default" } }),
  ]);

  if (!payout) notFound();

  const currency = settings?.currency ?? "GHS";
  const businessName = settings?.businessName ?? "First Class Washing Bay";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-10 px-4">
      <div className="no-print w-full max-w-md flex justify-between items-center mb-4">
        <Link href="/staff" className="text-primary text-sm font-medium">← Back</Link>
        <PrintButton />
      </div>

      <div className="print-receipt w-full max-w-md bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding font-data-tabular">
        <div className="text-center mb-6">
          <h1 className="text-headline-md font-headline-md font-bold text-primary">{businessName}</h1>
          {settings?.phone && <p className="text-xs text-on-surface-variant">{settings.phone}</p>}
          <p className="text-label-caps font-label-caps text-on-surface-variant mt-2">PAYMENT RECEIPT</p>
        </div>

        <div className="border-t border-dashed border-outline-variant my-4" />

        <dl className="space-y-2 text-sm">
          <Row label="Payslip #" value={payout.id.slice(-8).toUpperCase()} />
          <Row label="Paid To" value={payout.staff.name} />
          <Row label="Phone" value={payout.staff.phone} />
          <Row
            label="Period"
            value={`${payout.periodStart.toLocaleDateString()} – ${payout.periodEnd.toLocaleDateString()}`}
          />
          <Row label="Washes Covered" value={String(payout.washCount)} />
          <Row label="Date Paid" value={(payout.paidAt ?? payout.createdAt).toLocaleString()} />
          <Row label="Paid By" value={payout.createdBy.name} />
        </dl>

        <div className="border-t border-outline-variant my-4" />

        <div className="flex justify-between text-headline-md font-headline-md font-bold text-on-surface">
          <span>Amount Paid</span>
          <span>{formatMoney(payout.totalAmount, currency)}</span>
        </div>

        <div className="border-t border-dashed border-outline-variant my-4" />

        <p className="text-label-caps font-label-caps text-on-surface-variant mb-2">Vehicles Covered</p>
        <ul className="space-y-1 text-xs">
          {payout.washRecords.map((w) => (
            <li key={w.id} className="flex justify-between">
              <span>{w.vehiclePlate} · {w.serviceLabel}</span>
              <span>{formatMoney(w.amountStaff, currency)}</span>
            </li>
          ))}
        </ul>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          Keep this receipt as proof of payment. Thank you for your hard work!
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="text-on-surface text-right">{value}</dd>
    </div>
  );
}
