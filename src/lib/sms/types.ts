export interface SendSmsResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface BalanceResult {
  success: boolean;
  balance?: string;
  error?: string;
}

export interface SmsProvider {
  /** Human-readable name, used in logs and the settings screen. */
  readonly name: string;
  sendSms(toPhone: string, message: string): Promise<SendSmsResult>;
  /** Account credit/balance check, if the provider supports one. */
  getBalance(): Promise<BalanceResult>;
}
