export interface ExchangeRateResult {
  input: { amount: number; currency: string };
  result: { usd: number; lbp: number };
  rate: string;
}
