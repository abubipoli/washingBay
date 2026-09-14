import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffManager } from "@/components/settings/StaffManager";
import { BusinessSettingsForm } from "@/components/settings/BusinessSettingsForm";
import { SmsSettingsForm } from "@/components/settings/SmsSettingsForm";
import { CustomerManager } from "@/components/settings/CustomerManager";
import { UserManager } from "@/components/settings/UserManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const isOwner = session?.user.role === "OWNER";

  const [staff, settings, customers, users] = await Promise.all([
    prisma.staff.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.businessSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }),
    prisma.customer.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    isOwner
      ? prisma.user.findMany({
          orderBy: [{ active: "desc" }, { name: "asc" }],
          select: { id: true, name: true, email: true, role: true, active: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-stack-lg">
      <div>
        <h2 className="text-display-lg font-display-lg text-on-surface">Settings</h2>
        <p className="text-on-surface-variant mt-1">
          Manage your washing boys, SMS notifications, and customers.
        </p>
      </div>

      <BusinessSettingsForm
        initial={{
          businessName: settings.businessName,
          currency: settings.currency,
          address: settings.address,
          phone: settings.phone,
        }}
        isOwner={isOwner}
      />

      <StaffManager staff={staff} />

      <SmsSettingsForm
        initial={{
          smsProvider: settings.smsProvider,
          kairosAccessKey: settings.kairosAccessKey,
          kairosAccessSecret: settings.kairosAccessSecret,
          kairosSenderId: settings.kairosSenderId,
          payoutSmsTemplate: settings.payoutSmsTemplate,
          customerSmsTemplate: settings.customerSmsTemplate,
        }}
        isOwner={isOwner}
      />

      <CustomerManager
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, notes: c.notes, active: c.active }))}
      />

      {isOwner && <UserManager users={users} currentUserId={session!.user.id} />}
    </div>
  );
}
