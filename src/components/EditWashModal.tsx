"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { roundMoney } from "@/lib/money";

type ServiceType = { id: string; name: string };
type StaffOption = { id: string; name: string };

export type EditableWash = {
  id: string;
  vehiclePlate: string;
  vehicleMake: string | null;
  vehicleType: string;
  serviceTypeId: string | null;
  serviceLabel: string;
  staffId: string;
  totalAmount: number;
  amountBusiness: number;
  amountStaff: number;
  amountSoap: number;
  notes: string | null;
};

const VEHICLE_TYPES = [
  { value: "CAR", label: "Car" },
  { value: "SUV", label: "SUV" },
  { value: "TRUCK", label: "Truck" },
  { value: "BUS", label: "Bus" },
  { value: "MOTORBIKE", label: "Motorbike" },
  { value: "VAN", label: "Van" },
  { value: "OTHER", label: "Other" },
];

const inputClass =
  "w-full px-4 py-2 border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-surface-container-lowest";
const labelClass = "text-label-caps font-label-caps text-on-surface-variant block mb-1";

export function EditWashModal({
  open,
  onClose,
  wash,
  serviceTypes,
  staff,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  wash: EditableWash;
  serviceTypes: ServiceType[];
  staff: StaffOption[];
  currency: string;
}) {
  const router = useRouter();

  const [vehiclePlate, setVehiclePlate] = useState(wash.vehiclePlate);
  const [vehicleMake, setVehicleMake] = useState(wash.vehicleMake ?? "");
  const [vehicleType, setVehicleType] = useState(wash.vehicleType);
  const [serviceTypeId, setServiceTypeId] = useState(wash.serviceTypeId ?? "");
  const [serviceLabel, setServiceLabel] = useState(wash.serviceLabel);
  const [staffId, setStaffId] = useState(wash.staffId);
  const [total, setTotal] = useState(String(wash.totalAmount));
  const [business, setBusiness] = useState(String(wash.amountBusiness));
  const [staffCut, setStaffCut] = useState(String(wash.amountStaff));
  const [soap, setSoap] = useState(String(wash.amountSoap));
  const [notes, setNotes] = useState(wash.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setSubmitting(true);
    try {
      const res = await fetch(`/api/washes/${wash.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.formErrors?.[0] ?? body?.error ?? "Could not save changes");
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-headline-md font-headline-md text-on-surface">Edit Wash Record</h3>
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
              <label className={labelClass} htmlFor="e-vehiclePlate">Vehicle Number *</label>
              <input
                id="e-vehiclePlate"
                required
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                className={`${inputClass} font-data-tabular uppercase`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="e-vehicleMake">Make / Model (optional)</label>
              <input
                id="e-vehicleMake"
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="e-vehicleType">Vehicle Type</label>
              <select id="e-vehicleType" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className={inputClass}>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="e-staffId">Washing Boy *</label>
              <select id="e-staffId" required value={staffId} onChange={(e) => setStaffId(e.target.value)} className={inputClass}>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="e-serviceType">Service</label>
              <select id="e-serviceType" value={serviceTypeId} onChange={(e) => setServiceTypeId(e.target.value)} className={inputClass}>
                {serviceTypes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="e-serviceLabel">Description *</label>
              <input
                id="e-serviceLabel"
                required
                value={serviceLabel}
                onChange={(e) => setServiceLabel(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="e-total">Total Amount ({currency}) *</label>
            <input
              id="e-total"
              required
              type="number"
              min="0"
              step="0.01"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className={`${inputClass} font-data-tabular`}
            />
          </div>

          <div>
            <span className={labelClass}>Split — Business / Boy / Soap</span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <input
                  type="number" min="0" step="0.01" value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  className={`${inputClass} font-data-tabular text-primary`}
                  aria-label="Business share"
                />
                <p className="text-xs text-on-surface-variant mt-1 text-center">Business</p>
              </div>
              <div>
                <input
                  type="number" min="0" step="0.01" value={staffCut}
                  onChange={(e) => setStaffCut(e.target.value)}
                  className={`${inputClass} font-data-tabular`}
                  aria-label="Washing boy share"
                />
                <p className="text-xs text-on-surface-variant mt-1 text-center">Washing Boy</p>
              </div>
              <div>
                <input
                  type="number" min="0" step="0.01" value={soap}
                  onChange={(e) => setSoap(e.target.value)}
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
            <label className={labelClass} htmlFor="e-notes">Notes (optional)</label>
            <textarea
              id="e-notes"
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
            disabled={submitting}
            className="py-3 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
