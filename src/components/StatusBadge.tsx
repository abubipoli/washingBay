import type { WashStatus } from "@prisma/client";

const STYLES: Record<WashStatus, string> = {
  QUEUED: "bg-surface-container-highest text-on-surface",
  WASHING: "bg-primary/10 text-primary",
  DETAILING: "bg-secondary-container text-on-secondary-container",
  COMPLETED: "bg-success/10 text-success",
  CANCELLED: "bg-error-container text-on-error-container",
};

const LABELS: Record<WashStatus, string> = {
  QUEUED: "Queueing",
  WASHING: "Washing",
  DETAILING: "Detailing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: { status: WashStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
