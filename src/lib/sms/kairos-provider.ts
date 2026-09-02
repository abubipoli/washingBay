import type { SendSmsResult, SmsProvider } from "./types";

/**
 * Kairos Africa SMS gateway adapter.
 *
 * NOTE: Kairos Africa's exact request/response contract wasn't available
 * when this was written, so this adapter assumes a conventional REST shape
 * (Bearer auth, JSON body, POST /sms/send). Once you have their real API
 * docs, this is the only file you should need to touch — everything else in
 * the app talks to the `SmsProvider` interface, not to Kairos directly.
 * Adjust `endpoint`, the request body shape, and the response-parsing logic
 * below to match.
 */
export class KairosSmsProvider implements SmsProvider {
  readonly name = "Kairos Africa";

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor(config: { baseUrl: string; apiKey: string; senderId: string }) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.senderId = config.senderId;
  }

  async sendSms(toPhone: string, message: string): Promise<SendSmsResult> {
    if (!this.apiKey) {
      return { success: false, error: "KAIROS_API_KEY is not configured" };
    }

    const endpoint = `${this.baseUrl}/sms/send`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
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
}

function normalizePhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone.replace(/^0/, "233")}`;
}
