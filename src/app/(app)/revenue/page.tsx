import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { RevenueRecordingArea } from "@/components/RevenueRecordingArea";
import { SplitChips } from "@/components/SplitChips";
import { WashStatusSelect } from "@/components/WashStatusSelect";
import { EditWashButton } from "@/components/EditWashButton";
import type { WashStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const WASH_STATUSES: WashStatus[] = ["QUEUED", "WASHING", "DETAILING", "COMPLETED", "CANCELLED"];
function parseWashStatus(value: string | undefined): WashStatus | undefined {
  return WASH_STATUSES.find((s) => s === value);
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const session = await getServerSession(authOptions);
  const isOwner = session?.user.role === "OWNER";

  const [serviceTypes, staff, allServiceTypes, allStaff, settings, washes] = await Promise.all([
    // createdAt, not name — "Others" sorts before "Washing" alphabetically,
    // but Washing is the common case and should be the default selection.
    prisma.serviceType.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    prisma.staff.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    // Unfiltered lists for editing older records: a wash recorded against a
    // since-deactivated service or staff member must still show its real
    // value in the edit dropdown, not silently fall back to something else.
    prisma.serviceType.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.staff.findMany({ orderBy: { name: "asc" } }),
    prisma.businessSettings.findUnique({ where: { id: "default" } }),
    prisma.washRecord.findMany({
      where: {
        ...(searchParams.q
          ? { vehiclePlate: { contains: searchParams.q.toUpperCase(), mode: "insensitive" } }
          : {}),
        ...(parseWashStatus(searchParams.status) ? { status: parseWashStatus(searchParams.status) } : {}),
      },
      include: { staff: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const currency = settings?.currency ?? "GHS";
  const serviceTypeOptions = serviceTypes.map((s) => ({
    id: s.id,
    name: s.name,
    defaultPrice: s.defaultPrice.toString(),
    defaultBusinessPct: s.defaultBusinessPct,
    defaultStaffPct: s.defaultStaffPct,
    defaultSoapPct: s.defaultSoapPct,
  }));
  // Plain {id, name} only — allServiceTypes carries a Decimal field
  // (defaultPrice) that can't cross into a client component as-is.
  const allServiceTypeOptions = allServiceTypes.map((s) => ({ id: s.id, name: s.name }));
  const allStaffOptions = allStaff.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="flex flex-col gap-stack-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-display-lg font-display-lg text-on-surface">Revenue Recording</h2>
          <p className="text-on-surface-variant mt-1">
            Record every vehicle washed, split the payment three ways, and track it through completion.
          </p>
        </div>
        <RevenueRecordingArea serviceTypes={serviceTypeOptions} staff={staff} currency={currency} />
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-level-1 overflow-hidden">
          <div className="p-card-padding border-b border-outline-variant/30 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-surface-bright/50">
            <h3 className="text-headline-md font-headline-md">Wash Records</h3>
            <form className="flex gap-2" action="/revenue">
              <input
                name="q"
                defaultValue={searchParams.q}
                placeholder="Search vehicle number..."
                className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm"
              />
              <select name="status" defaultValue={searchParams.status ?? ""} className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm">
                <option value="">All statuses</option>
                <option value="QUEUED">Queueing</option>
                <option value="WASHING">Washing</option>
                <option value="DETAILING">Detailing</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button className="px-3 py-1.5 bg-surface-container-highest rounded-lg text-sm">Filter</button>
            </form>
          </div>
          <div className="overflow-x-auto max-h-[720px]">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead className="sticky top-0">
                <tr className="bg-surface-container-low text-on-surface-variant font-label-caps text-label-caps">
                  <th className="py-3 px-4 font-medium">Vehicle / Time</th>
                  <th className="py-3 px-4 font-medium">Boy</th>
                  <th className="py-3 px-4 font-medium">Service</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Total</th>
                  <th className="py-3 px-4 font-medium">
                    <div>Split</div>
                    <div className="flex gap-2 mt-0.5 normal-case font-normal text-[10px]">
                      <span className="text-primary">Business</span>
                      <span className="text-on-surface-variant">Washing Boy</span>
                      <span className="text-tertiary">Soap</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 font-medium">Receipt</th>
                  <th className="py-3 px-4 font-medium">Edit</th>
                </tr>
              </thead>
              <tbody className="text-data-tabular font-data-tabular">
                {washes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 px-4 text-center text-on-surface-variant">
                      No wash records match your filters.
                    </td>
                  </tr>
                )}
                {washes.map((w) => (
                  <tr key={w.id} className="border-b border-outline-variant/20 hover:bg-surface-bright transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-on-surface">{w.vehiclePlate}</div>
                      <div className="text-xs text-on-surface-variant">
                        {w.createdAt.toLocaleDateString()} {w.createdAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td className="py-3 px-4">{w.staff.name}</td>
                    <td className="py-3 px-4">{w.serviceLabel}</td>
                    <td className="py-3 px-4">
                      <WashStatusSelect washId={w.id} status={w.status} locked={!!w.payoutId} />
                    </td>
                    <td className="py-3 px-4 font-medium text-on-surface">{formatMoney(w.totalAmount, currency)}</td>
                    <td className="py-3 px-4">
                      <SplitChips business={w.amountBusiness} staff={w.amountStaff} soap={w.amountSoap} currency={currency} />
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/receipt/wash/${w.id}`} className="text-primary text-xs font-medium hover:underline">
                        View / Print
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <EditWashButton
                        locked={!!w.payoutId}
                        isOwner={isOwner}
                        serviceTypes={allServiceTypeOptions}
                        staff={allStaffOptions}
                        currency={currency}
                        wash={{
                          id: w.id,
                          vehiclePlate: w.vehiclePlate,
                          vehicleMake: w.vehicleMake,
                          vehicleType: w.vehicleType,
                          serviceTypeId: w.serviceTypeId,
                          serviceLabel: w.serviceLabel,
                          staffId: w.staffId,
                          totalAmount: Number(w.totalAmount),
                          amountBusiness: Number(w.amountBusiness),
                          amountStaff: Number(w.amountStaff),
                          amountSoap: Number(w.amountSoap),
                          notes: w.notes,
                        }}
                      />
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
