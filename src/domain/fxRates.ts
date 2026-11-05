// fxRates.ts — fixed demo exchange rates. R12: conversion is used ONLY for the
// dashboard's approximate base-currency total, always marked "≈" and labelled with the rate.
// In the real product these would be Visa's daily exchange rates.

import { CURRENCY_SYMBOL, symbolGap, type CurrencyCode } from "./config";

/** Label shown anywhere a demo rate is used. */
export const FX_LABEL = "Demo rate, fixed on Wed 4 Nov";

// Rates given in the brief. Others are derived through GBP.
//   1 EUR = 0.87 GBP
//   1 USD = 0.77 GBP
//   1 GBP = 1.15 EUR
//   1 GBP = 1.30 USD
// Added in change request 2 (demo rate): 1 NOK = 0.072 GBP, so 1 GBP = 1 / 0.072 NOK.
const TO_GBP: Record<CurrencyCode, number> = {
  GBP: 1,
  EUR: 0.87,
  USD: 0.77,
  NOK: 0.072,
};

const FROM_GBP: Record<CurrencyCode, number> = {
  GBP: 1,
  EUR: 1.15,
  USD: 1.3,
  NOK: 1 / 0.072,
};

/**
 * Convert an amount from one currency to another using fixed demo rates,
 * deriving cross rates through GBP. Amounts already in the target currency
 * are returned unchanged (no conversion).
 */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  if (from === to) return amount;
  const inGbp = amount * TO_GBP[from];
  if (to === "GBP") return inGbp;
  return inGbp * FROM_GBP[to];
}

/** The specific rate used for a single from→to pair, for display in "why" panels. */
export function rateFor(from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return 1;
  // Value of 1 `from` unit expressed in `to`.
  return convert(1, from, to);
}

/** A short human label like "€1 = £0.87" for a given pair. Small rates show 3 places. */
export function rateLabel(from: CurrencyCode, to: CurrencyCode): string {
  const r = rateFor(from, to);
  const shown = r < 0.1 ? r.toFixed(3) : r.toFixed(2);
  return `${CURRENCY_SYMBOL[from]}${symbolGap(from)}1 = ${CURRENCY_SYMBOL[to]}${symbolGap(to)}${shown}`;
}
