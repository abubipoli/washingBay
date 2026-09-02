import { prisma } from "@/lib/prisma";
import { ExpenseForm } from "@/components/settings/ExpenseForm";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const [settings, expenses] = await Promise.all([
    prisma.businessSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }),
    prisma.expense.findMany({
      include: { recordedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-stack-lg">
      <div>
        <h2 className="text-display-lg font-display-lg text-on-surface">Expenses</h2>
        <p className="text-on-surface-variant mt-1">Track day-to-day operating expenses like electricity, water, and supplies.</p>
      </div>

      <ExpenseForm
        expenses={expenses.map((e) => ({
          id: e.id,
          category: e.category,
          amount: e.amount.toString(),
          description: e.description,
          date: e.date.toISOString(),
          recordedBy: e.recordedBy,
        }))}
        currency={settings.currency}
      />
    </div>
  );
}
