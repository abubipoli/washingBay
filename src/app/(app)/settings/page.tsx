import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffManager } from "@/components/settings/StaffManager";
import { ServiceTypeManager } from "@/components/settings/ServiceTypeManager";
import { BusinessSettingsForm } from "@/components/settings/BusinessSettingsForm";
import { SmsSettingsForm } from "@/components/settings/SmsSettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const isOwner = session?.user.role === "OWNER";

  const [staff, serviceTypes, settings] = await Promise.all([
    prisma.staff.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.serviceType.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    prisma.businessSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }),
  ]);

  const currency = settings.currency;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-stack-lg">
      <div>
        <h2 className="text-display-lg font-display-lg text-on-surface">Settings</h2>
        <p className="text-on-surface-variant mt-1">
          Manage your washing boys, service pricing, and SMS notifications.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <StaffManager staff={staff} />
        <ServiceTypeManager
          serviceTypes={serviceTypes.map((s) => ({
            id: s.id,
            name: s.name,
            defaultPrice: s.defaultPrice.toString(),
            defaultBusinessPct: s.defaultBusinessPct,
            defaultStaffPct: s.defaultStaffPct,
            defaultSoapPct: s.defaultSoapPct,
            active: s.active,
          }))}
          isOwner={isOwner}
          currency={currency}
        />
      </div>

      <SmsSettingsForm
        initial={{
          smsProvider: settings.smsProvider,
          kairosAccessKey: settings.kairosAccessKey,
          kairosAccessSecret: settings.kairosAccessSecret,
          kairosSenderId: settings.kairosSenderId,
          payoutSmsTemplate: settings.payoutSmsTemplate,
        }}
        isOwner={isOwner}
      />
    </div>
  );
}
