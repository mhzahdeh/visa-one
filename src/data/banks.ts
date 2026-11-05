// banks.ts — fictional participating banks and their demo Visa cards (change request 2).
// The three seed banks reuse the cards in seed.json. New banks bring a small, fixed set of
// demo transactions, dated from DEMO_TODAY, that only enter state when the bank is added.
// All names are fictional.

import seed from "./seed.json";
import type { CurrencyCode } from "../domain/config";
import { TODAY_ISO, addDays } from "../domain/dates";
import type { Card, Country, SpendCategory, Transaction } from "../domain/types";

export type BankTile = "northbank" | "riverside" | "solano" | "nordlys" | "lumiere" | "harbour";

export interface Bank {
  id: string;
  name: string;
  country: Country;
  currency: CurrencyCode;
  tile: BankTile;
  initials: string;
  cards: Card[];
}

const seedCards = [...(seed.cards as Card[]), ...(seed.availableCards as Card[])];
const cardsOf = (bank: string) => seedCards.filter((c) => c.bank === bank);

function card(id: string, bank: string, country: Country, currency: CurrencyCode, last4: string, type: Card["type"]): Card {
  return { id, nickname: bank, bank, country, currency, last4, type, connected: false, includedInTotals: true };
}

export const BANKS: Bank[] = [
  { id: "northbank", name: "Northbank", country: "UK", currency: "GBP", tile: "northbank", initials: "NB", cards: cardsOf("Northbank") },
  { id: "riverside", name: "Riverside", country: "UK", currency: "GBP", tile: "riverside", initials: "RS", cards: cardsOf("Riverside") },
  { id: "solano", name: "Banco Solano", country: "ES", currency: "EUR", tile: "solano", initials: "BS", cards: cardsOf("Banco Solano") },
  {
    id: "nordlys",
    name: "Nordlys Bank",
    country: "NO",
    currency: "NOK",
    tile: "nordlys",
    initials: "NL",
    cards: [card("card-nordlys", "Nordlys Bank", "NO", "NOK", "2268", "debit")],
  },
  {
    id: "lumiere",
    name: "Banque Lumière",
    country: "FR",
    currency: "EUR",
    tile: "lumiere",
    initials: "BL",
    cards: [card("card-lumiere", "Banque Lumière", "FR", "EUR", "6634", "debit")],
  },
  {
    id: "harbour",
    name: "Harbour Bank",
    country: "US",
    currency: "USD",
    tile: "harbour",
    initials: "HB",
    cards: [card("card-harbour", "Harbour Bank", "US", "USD", "3915", "credit")],
  },
];

export function bankByName(name: string): Bank | undefined {
  return BANKS.find((b) => b.name === name);
}

type Row = [daysAgo: number, merchant: string, category: SpendCategory, amount: number];

const DEMO_ROWS: Record<string, Row[]> = {
  "card-nordlys": [
    [1, "Fjord Kaffe", "Eating out", 54],
    [3, "Bybuss", "Transport", 42],
    [5, "Nordmat", "Groceries", 189.5],
    [8, "Pizza Polar", "Takeaways", 229],
    [12, "Bybuss", "Transport", 42],
    [16, "Kiosk Nord", "Other", 38],
    [21, "Fjord Kaffe", "Eating out", 61],
    [27, "Nordmat", "Groceries", 212.4],
  ],
  "card-lumiere": [
    [2, "Boulangerie du Coin", "Eating out", 4.2],
    [6, "Métro Ligne 4", "Transport", 2.1],
    [11, "Petit Marché", "Groceries", 18.75],
    [19, "Crêpes et Cie", "Takeaways", 9.5],
    [25, "Petit Marché", "Groceries", 14.3],
  ],
  "card-harbour": [
    [2, "Harbor Light Coffee", "Eating out", 5.75],
    [7, "Bay Transit", "Transport", 2.9],
    [13, "Pier Deli", "Groceries", 21.4],
    [22, "Dockside Burgers", "Takeaways", 14.25],
  ],
};

/** The demo transactions for a newly added card (empty for seed cards). */
export function demoTransactionsFor(c: Card): Transaction[] {
  return (DEMO_ROWS[c.id] ?? []).map(([daysAgo, merchant, category, amount], i) => ({
    id: `${c.id}-t${i + 1}`,
    cardId: c.id,
    date: addDays(TODAY_ISO, -daysAgo),
    merchant,
    category,
    amount,
    currency: c.currency,
  }));
}
