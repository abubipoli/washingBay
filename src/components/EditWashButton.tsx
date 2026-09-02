"use client";

import { useState } from "react";
import { EditWashModal, type EditableWash } from "@/components/EditWashModal";

type ServiceType = { id: string; name: string };
type StaffOption = { id: string; name: string };

export function EditWashButton({
  wash,
  serviceTypes,
  staff,
  currency,
  locked,
  isOwner,
}: {
  wash: EditableWash;
  serviceTypes: ServiceType[];
  staff: StaffOption[];
  currency: string;
  locked: boolean;
  /** Editing a wash rewrites financial history for that job, so it's
   * restricted to the owner account ("high access"), same tier as editing
   * business settings or default service splits. */
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (locked) {
    return (
      <span className="text-on-surface-variant" title="Paid out — locked from editing">
        —
      </span>
    );
  }

  if (!isOwner) {
    return (
      <span className="text-on-surface-variant" title="Only the owner account can edit wash records">
        —
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-primary text-xs font-medium hover:underline flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-[16px]">edit</span>
        Edit
      </button>
      <EditWashModal
        open={open}
        onClose={() => setOpen(false)}
        wash={wash}
        serviceTypes={serviceTypes}
        staff={staff}
        currency={currency}
      />
    </>
  );
}
