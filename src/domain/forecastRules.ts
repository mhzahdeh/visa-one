// forecastRules.ts — the ONLY place numbers are produced (R1).
// Every value here comes from a simple, visible rule. The AI only writes words.

import type { CurrencyCode } from "./config";
import { convert, rateLabel } from "./fxRates";
import { daysFromToday, parseISO, windowStartISO, TODAY_ISO } from "./dates";
import type {
  AppState,
  Budget,
  BudgetPeriod,
  Card,
  Goal,
  Payday,
  SpendCategory,
  Transaction,
  UpcomingPayment,
} from "./types";

/** Usual daily spend per currency, by the brief: £19 and €1. Rounded whole units. */
export const USUAL_DAILY_SPEND: Partial<Record<CurrencyCode, number>> = {
  GBP: 19,
  EUR: 1,
};

/** Transactions on connected cards only (removed cards are hidden). */
export function connectedTx(state: AppState): Transaction[] {
  const ids = new Set(state.cards.filter((c) => c.connected).map((c) => c.id));
  return state.transactions.filter((t) => ids.has(t.cardId));
}

/** Transactions that count toward totals (connected AND card included in totals). */
export function totalsTx(state: AppState): Transaction[] {
  const ids = new Set(
    state.cards.filter((c) => c.connected && c.includedInTotals).map((c) => c.id)
  );
  return state.transactions.filter((t) => ids.has(t.cardId));
}

export function cardById(state: AppState, id: string): Card | undefined {
  return state.cards.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------

export type Period = "week" | "month";

function periodStartISO(period: Period): string {
  return windowStartISO(period === "week" ? 7 : 30);
}

/** Sum of spend in a given currency for the chosen period. Counts "Not my pattern" (R6). */
export function totalForCurrency(
  state: AppState,
  currency: CurrencyCode,
  period: Period
): number {
  const start = periodStartISO(period);
  return round2(
    totalsTx(state)
      .filter((t) => t.currency === currency && t.date >= start && t.date <= TODAY_ISO)
      .reduce((s, t) => s + t.amount, 0)
  );
}

/** Currencies that actually have spend in the period. */
export function currenciesWithSpend(state: AppState, period: Period): CurrencyCode[] {
  const start = periodStartISO(period);
  const set = new Set<CurrencyCode>();
  for (const t of totalsTx(state)) {
    if (t.date >= start && t.date <= TODAY_ISO) set.add(t.currency);
  }
  return [...set];
}

export interface BaseTotal {
  amount: number;
  base: CurrencyCode;
  parts: { currency: CurrencyCode; amount: number; converted: number }[];
  rateNote: string; // e.g. "demo rate €1 = £0.87"
}

/**
 * Approximate total in the base currency (R12). Marked "≈". Amounts already in
 * the base currency are not converted. Never used by any forecast/budget/goal.
 */
export function baseTotal(state: AppState, period: Period): BaseTotal {
  const base = state.baseCurrency;
  const currencies = currenciesWithSpend(state, period);
  const parts = currencies.map((currency) => {
    const amount = totalForCurrency(state, currency, period);
    return { currency, amount, converted: round2(convert(amount, currency, base)) };
  });
  const total = round2(parts.reduce((s, p) => s + p.converted, 0));
  // Build a readable rate note naming the non-base rates used.
  const foreign = currencies.filter((c) => c !== base);
  const rateNote =
    foreign.length > 0
      ? "demo rate " + foreign.map((c) => rateLabel(c, base)).join(", ")
      : "no conversion needed";
  return { amount: total, base, parts, rateNote };
}

// ---------------------------------------------------------------------------
// Per-card breakdown
// ---------------------------------------------------------------------------

export interface CardBreakdown {
  card: Card;
  spent: number; // in the card's own currency
  shareOfCurrency: number; // 0..1 of that currency's total
  topCategory: SpendCategory | null;
}

export function cardBreakdowns(state: AppState, period: Period): CardBreakdown[] {
  const start = periodStartISO(period);
  const connected = state.cards.filter((c) => c.connected);
  // Currency totals (only included cards) for share calc.
  const currencyTotals: Partial<Record<CurrencyCode, number>> = {};
  for (const c of currenciesWithSpend(state, period)) {
    currencyTotals[c] = totalForCurrency(state, c, period);
  }
  return connected.map((card) => {
    const tx = state.transactions.filter(
      (t) => t.cardId === card.id && t.date >= start && t.date <= TODAY_ISO
    );
    const spent = round2(tx.reduce((s, t) => s + t.amount, 0));
    const currencyTotal = currencyTotals[card.currency] ?? 0;
    const share = currencyTotal > 0 && card.includedInTotals ? spent / currencyTotal : 0;
    // Top category by spend.
    const byCat: Partial<Record<SpendCategory, number>> = {};
    for (const t of tx) byCat[t.category] = (byCat[t.category] ?? 0) + t.amount;
    let topCategory: SpendCategory | null = null;
    let max = -1;
    for (const [cat, amt] of Object.entries(byCat)) {
      if ((amt as number) > max) {
        max = amt as number;
        topCategory = cat as SpendCategory;
      }
    }
    return { card, spent, shareOfCurrency: share, topCategory };
  });
}

// ---------------------------------------------------------------------------
// Payday forecast (per currency)
// ---------------------------------------------------------------------------

export interface ForecastAssumptions {
  moneyUntilPayday: number;
  usualDailySpend: number;
  daysToPayday: number;
  knownPaymentsDue: { label: string; amount: number; date: string }[];
}

export interface Forecast {
  currency: CurrencyCode;
  payday: Payday;
  assumptions: ForecastAssumptions;
  knownPaymentsTotal: number;
  /** Positive = safe to spend, negative = short. */
  projected: number;
  short: boolean;
  shortfall: number; // absolute shortfall if short, else 0
  safeToSpend: number; // amount if not short, else 0
}

/** The next payday for a currency (soonest future date). */
export function nextPayday(state: AppState, currency: CurrencyCode): Payday | null {
  const candidates = state.paydays
    .filter((p) => p.currency === currency && daysFromToday(p.nextDate) >= 0)
    .sort((a, b) => (a.nextDate < b.nextDate ? -1 : 1));
  return candidates[0] ?? null;
}

/**
 * Core forecast rule:
 *   projected = moneyUntilPayday - (usualDailySpend * daysToPayday) - knownPaymentsDue
 * Known payments = upcoming recurring charges in this currency before the payday.
 * Demo GBP: 155 - (19 * 9) - 12.99 - 11.00 = about -40 (short).
 */
export function forecastForCurrency(
  state: AppState,
  currency: CurrencyCode,
  overrides?: Partial<ForecastAssumptions>
): Forecast | null {
  const payday = nextPayday(state, currency);
  if (!payday) return null;

  const daysToPayday = overrides?.daysToPayday ?? daysFromToday(payday.nextDate);
  const moneyUntilPayday =
    overrides?.moneyUntilPayday ?? state.moneyUntilPayday[currency] ?? 0;
  const usualDailySpend = overrides?.usualDailySpend ?? USUAL_DAILY_SPEND[currency] ?? 0;

  const knownPaymentsDue =
    overrides?.knownPaymentsDue ??
    state.upcoming
      .filter(
        (u) =>
          u.currency === currency &&
          daysFromToday(u.renewsOn) >= 0 &&
          parseISO(u.renewsOn) < parseISO(payday.nextDate)
      )
      .map((u) => ({ label: u.merchant, amount: u.amount, date: u.renewsOn }));

  const knownPaymentsTotal = round2(
    knownPaymentsDue.reduce((s, p) => s + p.amount, 0)
  );

  const projected = round2(
    moneyUntilPayday - usualDailySpend * daysToPayday - knownPaymentsTotal
  );
  const short = projected < 0;

  return {
    currency,
    payday,
    assumptions: { moneyUntilPayday, usualDailySpend, daysToPayday, knownPaymentsDue },
    knownPaymentsTotal,
    projected,
    short,
    shortfall: short ? round2(-projected) : 0,
    safeToSpend: short ? 0 : projected,
  };
}

/** All currencies that have a payday, with a forecast each. */
export function allForecasts(state: AppState): Forecast[] {
  const currencies = new Set(state.paydays.map((p) => p.currency));
  const out: Forecast[] = [];
  for (const c of currencies) {
    const f = forecastForCurrency(state, c);
    if (f) out.push(f);
  }
  return out;
}

/** Currencies that have spend but no payday → prompt to add a payday. */
export function currenciesNeedingPayday(state: AppState, period: Period): CurrencyCode[] {
  const withPayday = new Set(state.paydays.map((p) => p.currency));
  return currenciesWithSpend(state, period).filter((c) => !withPayday.has(c));
}

/** True if ANY forecast is short → hide rewards everywhere (R4). */
export function anyForecastShort(state: AppState): boolean {
  return allForecasts(state).some((f) => f.short);
}

// ---------------------------------------------------------------------------
// Habits (R6: exclude "Not my pattern" from habit maths)
// ---------------------------------------------------------------------------

export type Trend = "up" | "down" | "steady";

export interface HabitLine {
  category: SpendCategory;
  currency: CurrencyCode;
  perDay: number;
  perWeek: number;
  perMonth: number;
  trend: Trend;
  recentPerDay: number; // last 7 days
  usualPerDay: number; // the 8-weeks-before baseline
  count: number; // number of payments used
  windowDays: number;
}

/** Habit transactions: connected cards, excluding "Not my pattern". */
function habitTx(state: AppState): Transaction[] {
  return connectedTx(state).filter((t) => !t.notMyPattern && !t.subscription);
}

export function habitLines(state: AppState, currency: CurrencyCode): HabitLine[] {
  const windowDays = 28; // last 4 weeks
  const start = windowStartISO(windowDays);
  const recentStart = windowStartISO(7);
  const tx = habitTx(state).filter(
    (t) => t.currency === currency && t.date >= start && t.date <= TODAY_ISO
  );

  const cats = [...new Set(tx.map((t) => t.category))];
  return cats
    .map((category) => {
      const catTx = tx.filter((t) => t.category === category);
      const total = catTx.reduce((s, t) => s + t.amount, 0);
      const perDay = round2(total / windowDays);
      const recentTotal = catTx
        .filter((t) => t.date >= recentStart)
        .reduce((s, t) => s + t.amount, 0);
      const recentPerDay = round2(recentTotal / 7);
      // Baseline = the 3 weeks before the most recent week.
      const olderTotal = total - recentTotal;
      const usualPerDay = round2(olderTotal / (windowDays - 7));
      let trend: Trend = "steady";
      if (recentPerDay > usualPerDay * 1.15) trend = "up";
      else if (recentPerDay < usualPerDay * 0.85) trend = "down";
      return {
        category,
        currency,
        perDay,
        perWeek: round2(perDay * 7),
        perMonth: round2(perDay * 30),
        trend,
        recentPerDay,
        usualPerDay,
        count: catTx.length,
        windowDays,
      };
    })
    .sort((a, b) => b.perMonth - a.perMonth);
}

/** The single biggest upward change in habits (for the dashboard summary line 2). */
export function biggestHabitChange(
  state: AppState,
  currency: CurrencyCode
): HabitLine | null {
  const lines = habitLines(state, currency).filter((l) => l.trend === "up" && l.count >= 2);
  if (lines.length === 0) return null;
  return lines.sort(
    (a, b) => b.recentPerDay - b.usualPerDay - (a.recentPerDay - a.usualPerDay)
  )[0];
}

// ---------------------------------------------------------------------------
// Upcoming payments (next renewal)
// ---------------------------------------------------------------------------

export function nextUpcoming(state: AppState): UpcomingPayment | null {
  const future = state.upcoming
    .filter((u) => daysFromToday(u.renewsOn) >= 0)
    .sort((a, b) => (a.renewsOn < b.renewsOn ? -1 : 1));
  return future[0] ?? null;
}

// ---------------------------------------------------------------------------
// Budgets & goals
// ---------------------------------------------------------------------------

function periodDays(period: BudgetPeriod): number {
  switch (period) {
    case "daily":
      return 1;
    case "weekly":
      return 7;
    case "monthly":
      return 30;
    case "yearly":
      return 365;
  }
}

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  limit: number;
  fraction: number; // 0..1+
}

export function budgetProgress(state: AppState, budget: Budget): BudgetProgress {
  const start = windowStartISO(periodDays(budget.period));
  const tx = totalsTx(state).filter(
    (t) =>
      t.currency === budget.currency &&
      t.date >= start &&
      t.date <= TODAY_ISO &&
      (budget.category === "All" || t.category === budget.category)
  );
  const spent = round2(tx.reduce((s, t) => s + t.amount, 0));
  return {
    budget,
    spent,
    limit: budget.limit,
    fraction: budget.limit > 0 ? spent / budget.limit : 0,
  };
}

export interface GoalProgress {
  goal: Goal;
  /** How much the user has kept aside = limit-style target vs spend is user-defined;
   *  for a "keep X aside" goal we show spend in-period against a soft target. */
  spent: number;
  target: number;
  fraction: number;
  met: boolean;
}

/**
 * A goal like "Keep £50 aside this month" is met when spend stays low enough that
 * at least the target amount remains from money-until-payday. We model progress as
 * remaining = moneyUntilPayday - spend(period), and met when remaining >= target.
 */
export function goalProgress(state: AppState, goal: Goal): GoalProgress {
  const start = windowStartISO(periodDays(goal.period));
  const spent = round2(
    totalsTx(state)
      .filter((t) => t.currency === goal.currency && t.date >= start && t.date <= TODAY_ISO)
      .reduce((s, t) => s + t.amount, 0)
  );
  const pot = state.moneyUntilPayday[goal.currency] ?? 0;
  const remaining = round2(pot - spent);
  const fraction = goal.amount > 0 ? Math.max(0, remaining) / goal.amount : 0;
  return {
    goal,
    spent,
    target: goal.amount,
    fraction,
    met: remaining >= goal.amount,
  };
}

/** Rewards are only unlocked by weekly/monthly/yearly goals, never daily (R7). */
export function goalUnlocksReward(goal: Goal): boolean {
  return goal.period !== "daily";
}

// ---------------------------------------------------------------------------
// Savings tips (neutral, from the user's own payments only — R11)
// ---------------------------------------------------------------------------

export interface Tip {
  id: string;
  kind: "pause-subscription" | "set-budget" | "move-payment";
  category?: SpendCategory;
  currency: CurrencyCode;
  amount?: number;
  renewsOn?: string;
  merchantForWhy?: string; // used only in the "why" panel, never in the tip text
}

/**
 * Produce neutral tip opportunities from the user's own data. The TextWriter turns
 * these into words; tip text never names a merchant or brand (R11, guardrail).
 */
export function tipOpportunities(state: AppState): Tip[] {
  const tips: Tip[] = [];
  // 1) Subscription renewing soon that we could pause.
  const soon = state.upcoming
    .filter((u) => daysFromToday(u.renewsOn) >= 0 && daysFromToday(u.renewsOn) <= 7)
    .sort((a, b) => (a.renewsOn < b.renewsOn ? -1 : 1))[0];
  if (soon) {
    tips.push({
      id: `tip-pause-${soon.id}`,
      kind: "pause-subscription",
      currency: soon.currency,
      amount: soon.amount,
      renewsOn: soon.renewsOn,
      merchantForWhy: soon.merchant,
      category: "Subscriptions",
    });
  }
  // 2) Set a budget for the biggest discretionary habit trending up.
  const up = biggestHabitChange(state, "GBP");
  if (up) {
    tips.push({
      id: `tip-budget-${up.category}`,
      kind: "set-budget",
      category: up.category,
      currency: up.currency,
      amount: Math.round(up.perWeek),
    });
  }
  // 3) Move a payment until after payday (only if GBP forecast is short).
  const gbp = forecastForCurrency(state, "GBP");
  if (gbp?.short && gbp.assumptions.knownPaymentsDue.length > 0) {
    const p = gbp.assumptions.knownPaymentsDue[0];
    tips.push({
      id: `tip-move-${p.label}`,
      kind: "move-payment",
      currency: "GBP",
      amount: p.amount,
      renewsOn: p.date,
      merchantForWhy: p.label,
    });
  }
  return tips.slice(0, 3);
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
