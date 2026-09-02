import type { BalanceResult, SendSmsResult, SmsProvider } from "./types";

/**
 * Development/offline fallback: "sends" SMS by logging to the server
 * console instead of calling a real gateway. Useful when SMS_PROVIDER is
 * unset or when no credentials are configured yet — the rest of the payout
 * flow (marking staff paid, generating the audit trail) works identically.
 */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = "console (dev fallback — no real SMS sent)";

  async sendSms(toPhone: string, message: string): Promise<SendSmsResult> {
    // eslint-disable-next-line no-console
    console.log(`[sms:console] to=${toPhone} message="${message}"`);
    return { success: true, providerMessageId: `console-${Date.now()}` };
  }

  async getBalance(): Promise<BalanceResult> {
    return { success: false, error: "Console mode has no real account — switch to Kairos Africa to check balance" };
  }
}
