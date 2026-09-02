import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/api-guard";
import { getSmsProviderFromSettings } from "@/lib/sms";

const testSmsSchema = z.object({
  phone: z.string().trim().min(6).max(20),
  smsProvider: z.enum(["console", "kairos"]),
  kairosAccessKey: z.string().trim().optional().or(z.literal("")),
  kairosAccessSecret: z.string().trim().optional().or(z.literal("")),
  kairosSenderId: z.string().trim().optional().or(z.literal("")),
});

/**
 * Sends a one-off test SMS using whatever provider settings are currently
 * in the form (not necessarily saved yet), so an owner can verify Kairos
 * credentials work before committing to them.
 */
export async function POST(req: NextRequest) {
  const { response } = await requireOwner();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = testSmsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const provider = getSmsProviderFromSettings({
    smsProvider: parsed.data.smsProvider,
    kairosAccessKey: parsed.data.kairosAccessKey || null,
    kairosAccessSecret: parsed.data.kairosAccessSecret || null,
    kairosSenderId: parsed.data.kairosSenderId || null,
  });

  const result = await provider.sendSms(
    parsed.data.phone,
    "This is a test message from First Class Washing Bay — SMS notifications are working."
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Test SMS failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, providerMessageId: result.providerMessageId });
}
