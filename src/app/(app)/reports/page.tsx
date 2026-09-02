import { ReportGenerator } from "@/components/ReportGenerator";

export default function ReportsPage() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-stack-lg">
      <div>
        <h2 className="text-display-lg font-display-lg text-on-surface">Reports</h2>
        <p className="text-on-surface-variant mt-1">
          Generate a Summary, Commissions &amp; Staff Performance, Expenses, or Wash report for any date range —
          ready to print or save as a PDF.
        </p>
      </div>

      <ReportGenerator />
    </div>
  );
}
