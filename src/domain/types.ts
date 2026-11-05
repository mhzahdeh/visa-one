// types.ts — domain model for Visa One.

import type { CurrencyCode, Tone } from "./config";

export type Country = "UK" | "ES" | "NO" | "FR" | "US";

/** Short country label for chips and captions. */
export const COUNTRY_SHORT: Record<Country, string> = {
  UK: "UK",
  ES: "Spain",
  NO: "Norway",
  FR: "France",
  US: "US",
};

export const COUNTRY_NAME: Record<Country, string> = {
  UK: "United Kingdom",
  ES: "Spain",
  NO: "Norway",
  FR: "France",
  US: "United States",
};

export type SpendCategory =
  | "Takeaways"
  | "Groceries"
  | "Transport"
  | "Clothes"
  | "Subscriptions"
  | "Beauty"
  | "Eating out"
  | "Other";

export interface Card {
  id: string;
  nickname: string;
  bank: string;
  country: Country;
  currency: CurrencyCode;
  last4: string;
  type: "debit" | "credit";
  /** Connected = visible in Visa One. Removed cards keep their history but are hidden. */
  connected: boolean;
  /** Excluded cards stay connected but are left out of totals. */
  includedInTotals: boolean;
}

export interface Transaction {
  id: string;
  cardId: string;
  date: string; // ISO yyyy-mm-dd
  merchant: string;
  category: SpendCategory;
  amount: number; // positive = spend, in the card's own currency
  currency: CurrencyCode;
  /** User tagged "Not my pattern": still counts in totals/forecast, excluded from habits/insights/rewards. */
  notMyPattern?: boolean;
  /** True for a recurring subscription charge (for upcoming-renewals logic). */
  subscription?: boolean;
}

/** A future recurring charge known to the app (renews before/around payday). */
export interface UpcomingPayment {
  id: string;
  merchant: string;
  category: SpendCategory;
  amount: number;
  currency: CurrencyCode;
  renewsOn: string; // ISO date
  cardId: string;
}

export type PaydayFrequency = "weekly" | "fortnightly" | "monthly" | "one-off";

export interface Payday {
  id: string;
  name: string;
  nextDate: string; // ISO date
  frequency: PaydayFrequency;
  amount: number;
  currency: CurrencyCode;
}

export type BudgetPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface Budget {
  id: string;
  /** Category, or "All" for all spending. */
  category: SpendCategory | "All";
  currency: CurrencyCode;
  limit: number;
  period: BudgetPeriod;
}

export interface Goal {
  id: string;
  name: string;
  currency: CurrencyCode;
  amount: number;
  period: BudgetPeriod;
}

export interface Consent {
  cardPayments: boolean; // needed
  categories: boolean; // needed
  personalisedRewards: boolean; // off by default
}

/** Money the user says they have to live on until the next payday, per currency. */
export type MoneyUntilPayday = Partial<Record<CurrencyCode, number>>;

export interface WhyLogEntry {
  id: string;
  at: string; // ISO timestamp of when it was shown
  kind: "insight" | "summary" | "tip" | "reward";
  text: string;
  rule: string;
  detail: string;
}

export interface AppState {
  activated: boolean;
  onboarded: boolean;
  firstName: string | null;
  consent: Consent;
  tone: Tone;
  baseCurrency: CurrencyCode;
  cards: Card[];
  transactions: Transaction[];
  upcoming: UpcomingPayment[];
  paydays: Payday[];
  moneyUntilPayday: MoneyUntilPayday;
  budgets: Budget[];
  goals: Goal[];
  whyLog: WhyLogEntry[];
  /** Mode 2 toggle: use an LLM API for AI words. Default false (template mode). */
  useLlm: boolean;
}
