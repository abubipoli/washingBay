import { ReportGenerator } from "@/components/ReportGenerator";

export default function ReportsPage() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-stack-lg">
      <div>
        <h2 className="text-display-lg font-display-lg text-on-surface">Reports</h2>
        <p className="text-on-surface-variant mt-1">
          Generate a full business report for any date range — revenue, the business/boy/soap split, expenses, and
          staff payouts — ready to print or save as a PDF.
        </p>
      </div>

      <ReportGenerator />
    </div>
  );
}
