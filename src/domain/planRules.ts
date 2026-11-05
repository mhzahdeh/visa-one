// planRules.ts — numbers for budgets on the Plan screen (change request 2). forecastRules.ts
// stays unchanged; every function here is a simple, visible rule built on its results
// and its transaction filter (R1). Budgets never change any forecast number.

import type { CurrencyCode } from "./config";
import { TODAY_ISO, periodDaysLeft, periodStartISO } from "./dates";
import { forecastForCurrency, round2, totalsTx } from "./forecastRules";
import type { AppState, Budget, BudgetPeriod } from "./types";

export const PERIOD_DAYS: Record<BudgetPeriod, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  yearly: 365,
};

export interface BudgetView {
  budget: Budget;
  limit: number;
  spent: number;
  /** limit − spent. Negative = over the budget. */
  left: number;
  fraction: number;
  /** Days left in the calendar period after DEMO_TODAY. */
  daysLeft: number;
  /** "heads-up" from 75 percent used (calm amber), "ok" below. */
  status: "ok" | "headsup";
  currency: CurrencyCode;
  period: BudgetPeriod;
}

/**
 * Budget spending in the CURRENT CALENDAR PERIOD: payments in the budget's currency and
 * category from the period start (Monday, the 1st, or 1 Jan) up to the demo date, on
 * cards included in totals. "Not my pattern" payments count (R6). Demo: on Wed 4 Nov a
 * weekly budget counts Mon 2 to Wed 4 Nov and has 4 days to go.
 *
 * This replaces forecastRules.budgetProgress (a rolling 7/30/365-day window) for budgets:
 * a rolling window counted last week's payments too, so a new budget could start "over".
 */
export function budgetSpent(state: AppState, budget: Budget): number {
  const start = periodStartISO(budget.period);
  return round2(
    totalsTx(state)
      .filter(
        (t) =>
          t.currency === budget.currency &&
          t.date >= start &&
          t.date <= TODAY_ISO &&
          (budget.category === "All" || t.category === budget.category)
      )
      .reduce((s, t) => s + t.amount, 0)
  );
}

export function budgetView(state: AppState, budget: Budget): BudgetView {
  const spent = budgetSpent(state, budget);
  const fraction = budget.limit > 0 ? spent / budget.limit : 0;
  return {
    budget,
    limit: budget.limit,
    spent,
    left: round2(budget.limit - spent),
    fraction,
    daysLeft: periodDaysLeft(budget.period),
    status: fraction >= 0.75 ? "headsup" : "ok",
    currency: budget.currency,
    period: budget.period,
  };
}

/** The main budget: the first "All spending" budget, otherwise the first budget. */
export function mainBudget(state: AppState): Budget | null {
  return state.budgets.find((b) => b.category === "All") ?? state.budgets[0] ?? null;
}

/**
 * Suggested budget from the forecast: (money until payday − known payments before
 * payday) ÷ days to payday, times the days in the period, rounded DOWN to a multiple of 5.
 * Demo GBP weekly: (155 − 23.99) ÷ 9 × 7 = 101.90 → £100.
 */
export function suggestedBudget(state: AppState, currency: CurrencyCode, period: BudgetPeriod): number | null {
  const f = forecastForCurrency(state, currency);
  if (!f) return null;
  const perDay = (f.assumptions.moneyUntilPayday - f.knownPaymentsTotal) / Math.max(1, f.assumptions.daysToPayday);
  const amount = Math.floor((perDay * PERIOD_DAYS[period]) / 5) * 5;
  return Math.max(0, amount);
}

/** Live preview: a budget limit spread per day, rounded to the nearest whole unit ("about £11 a day"). */
export function perDayOf(limit: number, period: BudgetPeriod): number {
  return Math.round(limit / PERIOD_DAYS[period]);
}
