"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ServiceType = {
  id: string;
  name: string;
  defaultPrice: string;
  defaultBusinessPct: number;
  defaultStaffPct: number;
  defaultSoapPct: number;
  active: boolean;
};

/** Services are deliberately fixed to exactly "Washing" and "Others" — this
 * just lets the owner tune each one's default price/split, not add more. */
export function ServiceTypeManager({ serviceTypes, isOwner, currency }: { serviceTypes: ServiceType[]; isOwner: boolean; currency: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding flex flex-col gap-4">
      <div>
        <h3 className="text-headline-md font-headline-md">Services &amp; Default Splits</h3>
        <p className="text-sm text-on-surface-variant mt-1">
          Every wash is recorded as either <strong>Washing</strong> or <strong>Others</strong>. Set the usual price
          and business/boy/soap split here — a manager can still override it for any individual job.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {serviceTypes.map((s) => (
          <ServiceTypeRow key={s.id} service={s} isOwner={isOwner} currency={currency} />
        ))}
        {serviceTypes.length === 0 && (
          <p className="text-on-surface-variant text-sm">
            No active services found — run the seed script again, or check Prisma Studio.
          </p>
        )}
      </div>
    </div>
  );
}

function ServiceTypeRow({ service, isOwner, currency }: { service: ServiceType; isOwner: boolean; currency: string }) {
  const router = useRouter();
  const isManual = service.defaultBusinessPct + service.defaultStaffPct + service.defaultSoapPct === 0;

  const [price, setPrice] = useState(service.defaultPrice);
  const [businessPct, setBusinessPct] = useState(String(service.defaultBusinessPct));
  const [staffPct, setStaffPct] = useState(String(service.defaultStaffPct));
  const [soapPct, setSoapPct] = useState(String(service.defaultSoapPct));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const pctTotal = Number(businessPct || 0) + Number(staffPct || 0) + Number(soapPct || 0);

  async function save() {
    setError(null);
    if (!isManual && Math.abs(pctTotal - 100) >= 0.01) {
      setError(`Split percentages must total 100 (currently ${pctTotal}).`);
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/service-types/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultPrice: price,
        ...(isManual
          ? {}
          : {
              defaultBusinessPct: Number(businessPct),
              defaultStaffPct: Number(staffPct),
              defaultSoapPct: Number(soapPct),
            }),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.formErrors?.[0] ?? body?.error ?? "Could not save");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="border border-outline-variant rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-on-surface">{service.name}</p>
        {isManual && (
          <span className="text-xs text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">
            Manual split
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-on-surface-variant flex items-end min-h-[2rem] mb-1">Default price ({currency})</label>
          <input
            disabled={!isOwner}
            type="number" min="0" step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-data-tabular disabled:bg-surface-container-low"
          />
        </div>
        {!isManual && (
          <>
            <div>
              <label className="text-xs text-on-surface-variant flex items-end min-h-[2rem] mb-1">Business %</label>
              <input
                disabled={!isOwner}
                type="number" min="0" max="100" step="0.01"
                value={businessPct}
                onChange={(e) => setBusinessPct(e.target.value)}
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-data-tabular disabled:bg-surface-container-low"
              />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant flex items-end min-h-[2rem] mb-1">Boy %</label>
              <input
                disabled={!isOwner}
                type="number" min="0" max="100" step="0.01"
                value={staffPct}
                onChange={(e) => setStaffPct(e.target.value)}
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-data-tabular disabled:bg-surface-container-low"
              />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant flex items-end min-h-[2rem] mb-1">Soap %</label>
              <input
                disabled={!isOwner}
                type="number" min="0" max="100" step="0.01"
                value={soapPct}
                onChange={(e) => setSoapPct(e.target.value)}
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-data-tabular disabled:bg-surface-container-low"
              />
            </div>
          </>
        )}
      </div>

      {isOwner && (
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-label-caps font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {saved && <span className="text-success text-xs">Saved.</span>}
          {error && <span className="text-error text-xs">{error}</span>}
        </div>
      )}
    </div>
  );
}
