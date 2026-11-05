// initialState.ts — builds the starting AppState from the seed JSON.

import seed from "../data/seed.json";
import { DEFAULT_BASE_CURRENCY, DEFAULT_TONE } from "../domain/config";
import type { AppState, Card, Transaction, UpcomingPayment, Payday } from "../domain/types";

/** The cards a user's banks have enrolled but that aren't connected yet (for "Add a card"). */
export const AVAILABLE_CARDS: Card[] = seed.availableCards as Card[];

export function buildSeedState(): AppState {
  return {
    activated: false,
    onboarded: false,
    firstName: null,
    consent: {
      cardPayments: true,
      categories: true,
      personalisedRewards: false, // off by default
    },
    tone: DEFAULT_TONE,
    baseCurrency: DEFAULT_BASE_CURRENCY,
    cards: structuredClone(seed.cards) as Card[],
    transactions: structuredClone(seed.transactions) as Transaction[],
    upcoming: structuredClone(seed.upcoming) as UpcomingPayment[],
    paydays: structuredClone(seed.paydays) as Payday[],
    moneyUntilPayday: structuredClone(seed.moneyUntilPayday),
    budgets: [],
    goals: [],
    whyLog: [],
    useLlm: false,
  };
}
