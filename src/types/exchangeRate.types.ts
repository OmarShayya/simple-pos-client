export interface ExchangeRateResult {
  input: { amount: number; currency: string };
  result: { usd: number; lbp: number };
  rate: string;
}

export interface CurrentRate {
  /** LBP for 1 USD. */
  rate: number;
  currency: string;
}

/** One change of the rate (newest first from the API). */
export interface ExchangeRateRecord {
  id?: string;
  _id?: string;
  rate: number;
  previousRate?: number;
  notes?: string;
  updatedBy?: { id?: string; _id?: string; name: string; email?: string };
  effectiveFrom?: string;
  createdAt: string;
}
