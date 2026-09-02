import type { BalanceResult, SendSmsResult, SmsProvider } from "./types";

/**
 * Kairos Africa SMS gateway adapter.
 *
 * Contract confirmed against Kairos Afrika's official `@kairosafrika/sms`
 * SDK (github.com/Kairos-Afrika/sms-node): fixed API host, `x-api-key` /
 * `x-api-secret` headers (not HTTP Basic Auth), and specific endpoint paths
 * — none of which are documented on their public site, so this mirrors the
 * SDK's implementation rather than guessing.
 */
const KAIROS_BASE_URL = "https://api.kairosafrika.com/v1";

export class KairosSmsProvider implements SmsProvider {
  readonly name = "Kairos Africa";

  private readonly accessKey: string;
  private readonly accessSecret: string;
  private readonly senderId: string;

  constructor(config: { accessKey: string; accessSecret: string; senderId: string }) {
    this.accessKey = config.accessKey;
    this.accessSecret = config.accessSecret;
    this.senderId = config.senderId;
  }

  private authHeaders(): Record<string, string> {
    return { "x-api-key": this.accessKey, "x-api-secret": this.accessSecret };
  }

  async sendSms(toPhone: string, message: string): Promise<SendSmsResult> {
    if (!this.accessKey || !this.accessSecret) {
      return { success: false, error: "Kairos Africa API Access Key/Secret is not configured" };
    }

    try {
      const response = await fetch(`${KAIROS_BASE_URL}/external/sms/quick`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...this.authHeaders() },
        body: JSON.stringify({
          to: normalizePhone(toPhone),
          from: this.senderId,
          message,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload?.success === false) {
        return {
          success: false,
          error: payload?.statusMessage ?? `Kairos Africa returned HTTP ${response.status}`,
        };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown SMS error" };
    }
  }

  async getBalance(): Promise<BalanceResult> {
    if (!this.accessKey || !this.accessSecret) {
      return { success: false, error: "Kairos Africa API Access Key/Secret is not configured" };
    }

    try {
      const response = await fetch(`${KAIROS_BASE_URL}/external/account/balance`, {
        method: "GET",
        headers: { Accept: "application/json", ...this.authHeaders() },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload?.success === false) {
        return { success: false, error: payload?.statusMessage ?? `Kairos Africa returned HTTP ${response.status}` };
      }

      const credit = payload?.data?.credit;
      if (credit === undefined) {
        return { success: false, error: "Kairos Africa responded, but no balance field was found" };
      }

      return { success: true, balance: String(credit) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown error checking balance" };
    }
  }
}

/** Kairos expects MSISDNs without a leading "+", e.g. "233200746423". */
function normalizePhone(phone: string): string {
  const digits = phone.trim().replace(/[\s-]/g, "").replace(/^\+/, "");
  return digits.startsWith("0") ? `233${digits.slice(1)}` : digits;
}
