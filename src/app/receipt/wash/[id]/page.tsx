import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function WashReceiptPage({ params }: { params: { id: string } }) {
  const [wash, settings] = await Promise.all([
    prisma.washRecord.findUnique({
      where: { id: params.id },
      include: { staff: true, recordedBy: true },
    }),
    prisma.businessSettings.findUnique({ where: { id: "default" } }),
  ]);

  if (!wash) notFound();

  const currency = settings?.currency ?? "GHS";
  const businessName = settings?.businessName ?? "First Class Washing Bay";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-10 px-4">
      <div className="no-print w-full max-w-md flex justify-between items-center mb-4">
        <Link href="/revenue" className="text-primary text-sm font-medium">← Back</Link>
        <PrintButton />
      </div>

      <div className="print-receipt w-full max-w-md bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding font-data-tabular">
        <div className="text-center mb-6">
          <h1 className="text-headline-md font-headline-md font-bold text-primary">{businessName}</h1>
          {settings?.address && <p className="text-xs text-on-surface-variant">{settings.address}</p>}
          {settings?.phone && <p className="text-xs text-on-surface-variant">{settings.phone}</p>}
          <p className="text-label-caps font-label-caps text-on-surface-variant mt-2">WASH RECEIPT</p>
        </div>

        <div className="border-t border-dashed border-outline-variant my-4" />

        <dl className="space-y-2 text-sm">
          <Row label="Receipt #" value={wash.id.slice(-8).toUpperCase()} />
          <Row label="Date" value={wash.createdAt.toLocaleString()} />
          <Row label="Vehicle Number" value={wash.vehiclePlate} />
          {wash.vehicleMake && <Row label="Make / Model" value={wash.vehicleMake} />}
          <Row label="Service" value={wash.serviceLabel} />
          <Row label="Washed By" value={wash.staff.name} />
          <Row label="Status" value={wash.status} />
        </dl>

        <div className="border-t border-dashed border-outline-variant my-4" />

        <dl className="space-y-1 text-sm">
          <Row label="Business Share" value={formatMoney(wash.amountBusiness, currency)} />
          <Row label="Washing Boy Share" value={formatMoney(wash.amountStaff, currency)} />
          <Row label="Soap Share" value={formatMoney(wash.amountSoap, currency)} />
        </dl>

        <div className="border-t border-outline-variant my-4" />

        <div className="flex justify-between text-headline-md font-headline-md font-bold text-on-surface">
          <span>Total</span>
          <span>{formatMoney(wash.totalAmount, currency)}</span>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          Recorded by {wash.recordedBy.name} · Thank you for your business!
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
