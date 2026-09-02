import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, requireOwner } from "@/lib/api-guard";

const updateSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(100).optional(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code, e.g. GHS")
    .optional(),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  smsProvider: z.enum(["console", "kairos"]).optional(),
  kairosAccessKey: z.string().trim().max(300).optional().or(z.literal("")),
  kairosAccessSecret: z.string().trim().max(300).optional().or(z.literal("")),
  kairosSenderId: z.string().trim().max(20).optional().or(z.literal("")),
  payoutSmsTemplate: z.string().trim().max(480).optional().or(z.literal("")),
});

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const settings = await prisma.businessSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const { response } = await requireOwner();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const settings = await prisma.businessSettings.upsert({
    where: { id: "default" },
    update: parsed.data,
    create: { id: "default", ...parsed.data },
  });

  return NextResponse.json(settings);
}
