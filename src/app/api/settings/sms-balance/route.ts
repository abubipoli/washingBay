import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/api-guard";
import { getSmsProviderFromSettings } from "@/lib/sms";

const balanceSchema = z.object({
  smsProvider: z.enum(["console", "kairos"]),
  kairosAccessKey: z.string().trim().optional().or(z.literal("")),
  kairosAccessSecret: z.string().trim().optional().or(z.literal("")),
  kairosSenderId: z.string().trim().optional().or(z.literal("")),
});

/** Checks the SMS provider's account balance using the current form's
 * (not necessarily saved) credentials. */
export async function POST(req: NextRequest) {
  const { response } = await requireOwner();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = balanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const provider = getSmsProviderFromSettings({
    smsProvider: parsed.data.smsProvider,
    kairosAccessKey: parsed.data.kairosAccessKey || null,
    kairosAccessSecret: parsed.data.kairosAccessSecret || null,
    kairosSenderId: parsed.data.kairosSenderId || null,
  });

  const result = await provider.getBalance();
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Could not check balance" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, balance: result.balance });
}
