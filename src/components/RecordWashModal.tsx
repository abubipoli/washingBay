"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeDefaultSplit, roundMoney } from "@/lib/money";
import { enqueueWrite, isNetworkFailure } from "@/lib/offline/queue";

type ServiceType = {
  id: string;
  name: string;
  defaultPrice: string;
  defaultBusinessPct: number;
  defaultStaffPct: number;
  defaultSoapPct: number;
};
type StaffOption = { id: string; name: string };

const VEHICLE_TYPES = [
  { value: "CAR", label: "Car" },
  { value: "SUV", label: "SUV" },
  { value: "TRUCK", label: "Truck" },
  { value: "BUS", label: "Bus" },
  { value: "MOTORBIKE", label: "Motorbike" },
  { value: "VAN", label: "Van" },
  { value: "OTHER", label: "Other" },
];

/** "Others" ships with all-zero default percentages on purpose — it means
 * "no default, the manager types the split in by hand" rather than "split
 * 100% to business". */
function hasDefaultSplit(service: ServiceType | undefined): boolean {
  return !!service && service.defaultBusinessPct + service.defaultStaffPct + service.defaultSoapPct > 0;
}

const inputClass =
  "w-full px-4 py-2 border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-surface-container-lowest";
const labelClass = "text-label-caps font-label-caps text-on-surface-variant block mb-1";

export function RecordWashModal({
  open,
  onClose,
  serviceTypes,
  staff,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  serviceTypes: ServiceType[];
  staff: StaffOption[];
  currency: string;
}) {
  const router = useRouter();

  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleType, setVehicleType] = useState("CAR");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [serviceLabel, setServiceLabel] = useState("");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [total, setTotal] = useState("0");
  const [business, setBusiness] = useState("0");
  const [staffCut, setStaffCut] = useState("0");
  const [soap, setSoap] = useState("0");
  const [splitTouched, setSplitTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedWashId, setSavedWashId] = useState<string | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);

  const selectedService = useMemo(
    () => serviceTypes.find((s) => s.id === serviceTypeId),
    [serviceTypeId, serviceTypes]
  );

  function applyServiceDefaults(service: ServiceType | undefined, newTotal: string) {
    if (!service || !hasDefaultSplit(service)) {
      // No default split (e.g. "Others") — leave the split fields for the
      // manager to fill in by hand rather than guessing a distribution.
      return;
    }
    const totalNum = Number(newTotal || 0);
    const split = computeDefaultSplit(
      totalNum,
      service.defaultBusinessPct,
      service.defaultStaffPct,
      service.defaultSoapPct
    );
    setBusiness(String(split.business));
    setStaffCut(String(split.staff));
    setSoap(String(split.soap));
  }

  function resetForm() {
    const first = serviceTypes[0];
    setVehiclePlate("");
    setVehicleMake("");
    setVehicleType("CAR");
    setServiceTypeId(first?.id ?? "");
    setServiceLabel(first?.name ?? "");
    setStaffId(staff[0]?.id ?? "");
    setNotes("");
    setSplitTouched(false);
    setError(null);
    setSavedWashId(null);
    setSavedOffline(false);
    setSubmitting(false);
    if (first) {
      setTotal(first.defaultPrice);
      if (hasDefaultSplit(first)) {
        applyServiceDefaults(first, first.defaultPrice);
      } else {
        setBusiness("0");
        setStaffCut("0");
        setSoap("0");
      }
    } else {
      setTotal("0");
      setBusiness("0");
      setStaffCut("0");
      setSoap("0");
    }
  }

  // Re-seed the form fresh every time the modal opens.
  useEffect(() => {
    if (open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleServiceChange(id: string) {
    setServiceTypeId(id);
    const service = serviceTypes.find((s) => s.id === id);
    if (service) {
      setServiceLabel(service.name);
      setTotal(service.defaultPrice);
      setSplitTouched(false);
      if (hasDefaultSplit(service)) {
        applyServiceDefaults(service, service.defaultPrice);
      } else {
        setBusiness("0");
        setStaffCut("0");
        setSoap("0");
      }
    }
  }

  function handleTotalChange(value: string) {
    setTotal(value);
    if (!splitTouched && hasDefaultSplit(selectedService)) {
      applyServiceDefaults(selectedService, value || "0");
    }
  }

  const sumCheck = roundMoney(Number(business || 0) + Number(staffCut || 0) + Number(soap || 0));
  const totalNum = roundMoney(Number(total || 0));
  const splitMismatch = sumCheck !== totalNum;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (splitMismatch) {
      setError(`Business + Boy + Soap (${sumCheck}) must equal the total (${totalNum})`);
      return;
    }

    const payload = {
      vehiclePlate,
      vehicleMake: vehicleMake || undefined,
      vehicleType,
      serviceTypeId: serviceTypeId || undefined,
      serviceLabel,
      staffId,
      totalAmount: totalNum,
      amountBusiness: Number(business),
      amountStaff: Number(staffCut),
      amountSoap: Number(soap),
      notes: notes || undefined,
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/washes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error?.formErrors?.[0] ?? body?.error ?? "Could not save this wash");
      }

      router.refresh();
      setSavedWashId(body.id);
    } catch (err) {
      if (isNetworkFailure(err)) {
        await enqueueWrite("wash", `${vehiclePlate} — ${currency} ${totalNum}`, "/api/washes", payload);
        setSavedOffline(true);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-surface-container-lowest rounded-xl shadow-level-2 w-full max-w-lg max-h-[90vh] overflow-y-auto p-card-padding">
        {savedOffline ? (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 48 }}>
              cloud_off
            </span>
            <h3 className="text-headline-md font-headline-md">Saved offline</h3>
            <p className="text-on-surface-variant">
              No connection right now, so this wash was saved on this device. It'll sync automatically once you're
              back online — check the pending badge at the top of the screen.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps font-medium hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
            <button onClick={resetForm} className="text-primary text-label-caps font-label-caps mt-1">
              + Record another wash
            </button>
          </div>
        ) : savedWashId ? (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <span className="material-symbols-outlined text-success" style={{ fontSize: 48 }}>
              check_circle
            </span>
            <h3 className="text-headline-md font-headline-md">Wash recorded!</h3>
            <p className="text-on-surface-variant">What would you like to do next?</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
              <button
                onClick={() => {
                  window.open(`/receipt/wash/${savedWashId}`, "_blank");
                  onClose();
                }}
                className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps font-medium hover:bg-primary/90 transition-colors"
              >
                Generate Receipt
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-surface-container-highest text-on-surface rounded-lg font-label-caps text-label-caps font-medium hover:bg-surface-variant transition-colors"
              >
                Just Save
              </button>
            </div>
            <button onClick={resetForm} className="text-primary text-label-caps font-label-caps mt-1">
              + Record another wash
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-headline-md font-headline-md text-on-surface">Record a Wash</h3>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label="Close"
                className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="vehiclePlate">Vehicle Number *</label>
                <input
                  id="vehiclePlate"
                  required
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  placeholder="GR 1234-24"
                  className={`${inputClass} font-data-tabular uppercase`}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="vehicleMake">Make / Model (optional)</label>
                <input
                  id="vehicleMake"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  placeholder="Toyota Camry"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="vehicleType">Vehicle Type</label>
                <select id="vehicleType" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className={inputClass}>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="staffId">Washing Boy *</label>
                <select id="staffId" required value={staffId} onChange={(e) => setStaffId(e.target.value)} className={inputClass}>
                  {staff.length === 0 && <option value="">Add a staff member in Settings first</option>}
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="serviceType">Service</label>
                <select id="serviceType" value={serviceTypeId} onChange={(e) => handleServiceChange(e.target.value)} className={inputClass}>
                  {serviceTypes.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="serviceLabel">Description *</label>
                <input
                  id="serviceLabel"
                  required
                  value={serviceLabel}
                  onChange={(e) => setServiceLabel(e.target.value)}
                  placeholder="e.g. Body wash + vacuum"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="total">Total Amount ({currency}) *</label>
              <input
                id="total"
                required
                type="number"
                min="0"
                step="0.01"
                value={total}
                onChange={(e) => handleTotalChange(e.target.value)}
                className={`${inputClass} font-data-tabular`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className={labelClass}>Split — Business / Boy / Soap</span>
                {splitTouched && hasDefaultSplit(selectedService) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSplitTouched(false);
                      applyServiceDefaults(selectedService, total);
                    }}
                    className="text-primary text-label-caps font-label-caps"
                  >
                    Reset to default split
                  </button>
                )}
              </div>
              {!hasDefaultSplit(selectedService) && (
                <p className="text-xs text-on-surface-variant mb-2">
                  &ldquo;Others&rdquo; has no default split — enter the three amounts yourself.
                </p>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <input
                    type="number" min="0" step="0.01" value={business}
                    onChange={(e) => { setBusiness(e.target.value); setSplitTouched(true); }}
                    className={`${inputClass} font-data-tabular text-primary`}
                    aria-label="Business share"
                  />
                  <p className="text-xs text-on-surface-variant mt-1 text-center">Business</p>
                </div>
                <div>
                  <input
                    type="number" min="0" step="0.01" value={staffCut}
                    onChange={(e) => { setStaffCut(e.target.value); setSplitTouched(true); }}
                    className={`${inputClass} font-data-tabular`}
                    aria-label="Washing boy share"
                  />
                  <p className="text-xs text-on-surface-variant mt-1 text-center">Washing Boy</p>
                </div>
                <div>
                  <input
                    type="number" min="0" step="0.01" value={soap}
                    onChange={(e) => { setSoap(e.target.value); setSplitTouched(true); }}
                    className={`${inputClass} font-data-tabular text-tertiary`}
                    aria-label="Soap share"
                  />
                  <p className="text-xs text-on-surface-variant mt-1 text-center">Soap</p>
                </div>
              </div>
              {splitMismatch && (
                <p className="text-error text-sm mt-2">
                  Business + Boy + Soap = {sumCheck}, but the total is {totalNum}. Adjust before saving.
                </p>
              )}
            </div>

            <div>
              <label className={labelClass} htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>

            {error && (
              <p className="text-sm text-error bg-error-container px-3 py-2 rounded-lg" role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || staff.length === 0}
              className="py-3 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Wash Record"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
