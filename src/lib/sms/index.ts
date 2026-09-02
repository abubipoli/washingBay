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

export const DEFAULT_PAYOUT_SMS_TEMPLATE =
  "{{businessName}}: Hi {{staffName}}, you have been paid {{amount}} for {{washCount}} wash(es) — {{periodLabel}}. Thank you for your hard work!";

export const PAYOUT_SMS_PLACEHOLDERS = [
  "{{staffName}}",
  "{{amount}}",
  "{{washCount}}",
  "{{periodLabel}}",
  "{{businessName}}",
] as const;

/**
 * Fills in the payout SMS template (owner-editable in Settings, falling
 * back to DEFAULT_PAYOUT_SMS_TEMPLATE) with this payout's actual values.
 * Plain string replacement, not a templating engine — {{placeholder}}
 * tokens only, so the wording stays simple enough for a non-technical
 * owner to safely edit.
 */
export function buildPayoutSmsMessage(params: {
  staffName: string;
  amount: string;
  washCount: number;
  periodLabel: string;
  businessName: string;
  template?: string | null;
}): string {
  const template = params.template?.trim() || DEFAULT_PAYOUT_SMS_TEMPLATE;
  return template
    .replaceAll("{{staffName}}", params.staffName)
    .replaceAll("{{amount}}", params.amount)
    .replaceAll("{{washCount}}", String(params.washCount))
    .replaceAll("{{periodLabel}}", params.periodLabel)
    .replaceAll("{{businessName}}", params.businessName);
}
