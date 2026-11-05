// config.ts — single source of truth for the demo clock and app constants.
// R13: all dates and "days to payday" are counted from DEMO_TODAY, never the system clock.

/** The app's fixed "today": Wed 4 Nov 2026. Never use `new Date()` for calculations. */
export const DEMO_TODAY = new Date("2026-11-04T00:00:00");

/** Human label shown in Control and elsewhere. */
export const DEMO_TODAY_LABEL = "Wed 4 Nov";

export const APP_NAME = "Visa One";
export const APP_MOTTO = "All your cards, one view, powered by Visa.";
export const DISCLAIMER = "Student concept. Not an official Visa product.";

export const LOCALSTORAGE_KEY = "visa-one-state-v1";

export type CurrencyCode = "GBP" | "EUR" | "USD" | "NOK";

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
  NOK: "kr",
};

/** Letter symbols (kr) get a thin space before the number: "kr 450". */
export function symbolGap(currency: CurrencyCode): string {
  return /[a-z]/i.test(CURRENCY_SYMBOL[currency]) ? "\u2009" : "";
}

export const DEFAULT_BASE_CURRENCY: CurrencyCode = "GBP";

export type Tone = "Professional" | "Personal" | "Sassy";
export const DEFAULT_TONE: Tone = "Personal";
