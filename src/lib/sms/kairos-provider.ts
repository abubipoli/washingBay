import type { BalanceResult, SendSmsResult, SmsProvider } from "./types";

/**
 * Kairos Africa SMS gateway adapter.
 *
 * Kairos Africa authenticates with an Access Key + Access Secret pair (see
 * their dashboard's "API Access Credential" panel), not a single API key.
 * Their exact request contract wasn't available when this was written, so
 * this sends the pair as HTTP Basic Auth (`key:secret`, base64-encoded) —
 * the conventional way REST APIs consume a key/secret pair (same pattern as
 * Twilio's Account SID + Auth Token). If Kairos's real docs specify a
 * different scheme (e.g. both values in the JSON body, or an HMAC
 * signature), this is the only file that needs to change — everything else
 * in the app talks to the `SmsProvider` interface, not to Kairos directly.
 */
export class KairosSmsProvider implements SmsProvider {
  readonly name = "Kairos Africa";

  private readonly baseUrl: string;
  private readonly accessKey: string;
  private readonly accessSecret: string;
  private readonly senderId: string;

  constructor(config: { baseUrl: string; accessKey: string; accessSecret: string; senderId: string }) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.accessKey = config.accessKey;
    this.accessSecret = config.accessSecret;
    this.senderId = config.senderId;
  }

  async sendSms(toPhone: string, message: string): Promise<SendSmsResult> {
    if (!this.accessKey || !this.accessSecret) {
      return { success: false, error: "Kairos Africa API Access Key/Secret is not configured" };
    }

    const endpoint = `${this.baseUrl}/sms/send`;
    const basicAuth = Buffer.from(`${this.accessKey}:${this.accessSecret}`).toString("base64");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          to: normalizePhone(toPhone),
          message,
          sender_id: this.senderId,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: payload?.message ?? `Kairos Africa returned HTTP ${response.status}`,
        };
      }

      return { success: true, providerMessageId: payload?.id ?? payload?.message_id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown SMS error" };
    }
  }

  /**
   * Best-effort account balance check — Kairos's exact endpoint/field names
   * weren't available when this was written, so this tries the conventional
   * `/balance` path and looks for a handful of likely field names in the
   * response. If Kairos's real docs specify a different path or shape, this
   * is the only method that needs to change.
   */
  async getBalance(): Promise<BalanceResult> {
    if (!this.accessKey || !this.accessSecret) {
      return { success: false, error: "Kairos Africa API Access Key/Secret is not configured" };
    }

    const endpoint = `${this.baseUrl}/balance`;
    const basicAuth = Buffer.from(`${this.accessKey}:${this.accessSecret}`).toString("base64");

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: { Authorization: `Basic ${basicAuth}` },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: payload?.message ?? `Kairos Africa returned HTTP ${response.status}`,
        };
      }

      const raw =
        payload?.balance ?? payload?.credits ?? payload?.sms_balance ?? payload?.data?.balance ?? payload?.data?.credits;

      if (raw === undefined) {
        return { success: false, error: "Kairos Africa responded, but no recognizable balance field was found" };
      }

      return { success: true, balance: String(raw) };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown error checking balance" };
    }
  }
}

function normalizePhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone.replace(/^0/, "233")}`;
}
