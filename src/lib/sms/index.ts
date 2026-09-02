import { ConsoleSmsProvider } from "./console-provider";
import { KairosSmsProvider } from "./kairos-provider";
import type { SmsProvider } from "./types";

export type { SmsProvider, SendSmsResult } from "./types";

/** Minimal shape this needs from a BusinessSettings row — kept separate from
 * the Prisma type so callers can pass a plain object in tests. */
export type SmsSettings = {
  smsProvider: string;
  kairosBaseUrl: string | null;
  kairosAccessKey: string | null;
  kairosAccessSecret: string | null;
  kairosSenderId: string | null;
};

/**
 * Builds the SMS provider from the owner's Settings screen configuration
 * (DB-backed, editable at runtime), falling back to the matching .env
 * variable for any field left blank in Settings — so a deployment can still
 * be configured purely through environment variables if preferred. Not
 * cached: settings can change between requests, and constructing the
 * provider is cheap.
 */
export function getSmsProviderFromSettings(settings: SmsSettings): SmsProvider {
  if (settings.smsProvider === "kairos") {
    return new KairosSmsProvider({
      baseUrl: settings.kairosBaseUrl || process.env.KAIROS_API_BASE_URL || "",
      accessKey: settings.kairosAccessKey || process.env.KAIROS_ACCESS_KEY || "",
      accessSecret: settings.kairosAccessSecret || process.env.KAIROS_ACCESS_SECRET || "",
      senderId: settings.kairosSenderId || process.env.KAIROS_SENDER_ID || "FirstClass",
    });
  }
  return new ConsoleSmsProvider();
}

export function buildPayoutSmsMessage(params: {
  staffName: string;
  amount: string;
  washCount: number;
  periodLabel: string;
  businessName: string;
}): string {
  const { staffName, amount, washCount, periodLabel, businessName } = params;
  return `${businessName}: Hi ${staffName}, you have been paid ${amount} for ${washCount} wash(es) — ${periodLabel}. Thank you for your hard work!`;
}
