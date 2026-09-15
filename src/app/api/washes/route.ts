import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { createWashSchema } from "@/lib/validation";
import { formatMoney } from "@/lib/money";
import { buildCustomerSmsMessage, getSmsProviderFromSettings } from "@/lib/sms";
import type { WashStatus } from "@prisma/client";

const WASH_STATUSES: WashStatus[] = ["QUEUED", "WASHING", "DETAILING", "COMPLETED", "CANCELLED"];
function parseWashStatus(value: string | null): WashStatus | undefined {
  return WASH_STATUSES.find((s) => s === value);
}

export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const staffId = searchParams.get("staffId");
  const status = parseWashStatus(searchParams.get("status"));
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  const washes = await prisma.washRecord.findMany({
    where: {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(staffId ? { staffId } : {}),
      ...(status ? { status } : {}),
    },
    include: { staff: true, serviceType: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(washes);
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = createWashSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const staff = await prisma.staff.findUnique({ where: { id: data.staffId } });
  if (!staff || !staff.active) {
    return NextResponse.json({ error: "Selected washing boy is not available" }, { status: 400 });
  }

  // Match or create the customer by phone — the Customers list (Settings)
  // grows on its own as new phone numbers come through here, same contact
  // record whether they were added by hand or picked up from a wash. If the
  // phone already belongs to someone, this never creates a second row for
  // it — instead the existing record's name is overwritten with whatever
  // was just typed (e.g. a corrected spelling), so the list stays current
  // instead of silently keeping stale/duplicate-looking entries.
  let customerId: string | null = null;
  const customerPhone = data.customerPhone?.trim();
  const customerName = data.customerName?.trim();
  if (customerPhone) {
    const existing = await prisma.customer.findUnique({ where: { phone: customerPhone } });
    if (existing) {
      customerId = existing.id;
      if (customerName && customerName !== existing.name) {
        await prisma.customer.update({ where: { id: existing.id }, data: { name: customerName } });
      }
    } else {
      customerId = (
        await prisma.customer.create({
          data: { name: customerName || "Customer", phone: customerPhone },
        })
      ).id;
    }
  }

  const wash = await prisma.washRecord.create({
    data: {
      vehiclePlate: data.vehiclePlate.toUpperCase(),
      vehicleMake: data.vehicleMake || null,
      vehicleType: data.vehicleType,
      serviceLabel: data.serviceLabel,
      serviceTypeId: data.serviceTypeId ?? null,
      staffId: data.staffId,
      customerId,
      totalAmount: data.totalAmount,
      amountBusiness: data.amountBusiness,
      amountStaff: data.amountStaff,
      amountSoap: data.amountSoap,
      notes: data.notes || null,
      recordedById: session!.user.id,
    },
    include: { staff: true, serviceType: true, customer: true },
  });

  if (data.notifyCustomer && wash.customer) {
    const settings = await prisma.businessSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
    const message = buildCustomerSmsMessage({
      customerName: wash.customer.name,
      vehiclePlate: wash.vehiclePlate,
      serviceLabel: wash.serviceLabel,
      amount: formatMoney(wash.totalAmount, settings.currency),
      businessName: settings.businessName,
      template: settings.customerSmsTemplate,
    });
    await getSmsProviderFromSettings(settings).sendSms(wash.customer.phone, message);
  }

  return NextResponse.json(wash, { status: 201 });
}
