"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecordWashModal } from "@/components/RecordWashModal";

type ServiceType = {
  id: string;
  name: string;
  defaultPrice: string;
  defaultBusinessPct: number;
  defaultStaffPct: number;
  defaultSoapPct: number;
};
type StaffOption = { id: string; name: string };

/** The "Record Wash" trigger + pop-up modal for the Revenue Recording page.
 * Also opens itself automatically when linked to via `?action=new` (used by
 * the sidebar's "Record Wash" / topbar's "Add Entry" quick links). */
export function RevenueRecordingArea({
  serviceTypes,
  staff,
  currency,
}: {
  serviceTypes: ServiceType[];
  staff: StaffOption[];
  currency: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setOpen(true);
      router.replace("/revenue");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-caps font-label-caps font-medium hover:bg-primary/90 transition-colors shadow-sm"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Record Wash
      </button>
      <RecordWashModal
        open={open}
        onClose={() => setOpen(false)}
        serviceTypes={serviceTypes}
        staff={staff}
        currency={currency}
      />
    </>
  );
}
