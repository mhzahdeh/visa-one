// textWriter.ts — the ONLY place AI words are produced. Numbers always come from
// forecastRules.ts (R1), or planRules.ts which only does arithmetic on those results.
// Two modes:
//   Mode 1 (default, offline): per-tone templates. The whole app works in this mode.
//   Mode 2 (optional): call an LLM API with rule results + tone, then run guardrails.
//
// R5 (change request 2): tone changes words only, never numbers or rules. Professional
// and Personal turn calm and kind when the user is short. Sassy STAYS sassy when short,
// because the user chose it: playful tough love about the spending, never the person.
// Every Sassy line runs through `guardSassy`; if it fails the Sassy guardrail, the calm
// Personal line is used instead. Only Sassy text contains emoji.

import { CURRENCY_SYMBOL, symbolGap, type CurrencyCode, type Tone } from "./config";
import { formatDate, daysFromToday, todayWeekdayName } from "./dates";
import type { Forecast, HabitLine, Tip } from "./forecastRules";
import type { BudgetPeriod, UpcomingPayment } from "./types";
import { checkSassy, checkText, checkTip } from "./guardrails";

/** The number part of an amount: whole numbers show no decimals, otherwise two places. */
export function formatAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const isWhole = Math.abs(rounded - Math.round(rounded)) < 0.005;
  return isWhole ? String(Math.round(rounded)) : rounded.toFixed(2);
}

export function money(amount: number, currency: CurrencyCode): string {
  return `${CURRENCY_SYMBOL[currency]}${symbolGap(currency)}${formatAmount(amount)}`;
}

/**
 * Whole-unit amount for "about …" wording. Rounds conservatively so the words never
 * look better than the rule result: a shortfall rounds UP (£39.99 → £40) and a
 * safe-to-spend amount rounds DOWN (€23.01 → €23). The exact figure is always shown
 * in the matching "why" sheet (R1, R8).
 */
export function approxWhole(amount: number, kind: "shortfall" | "safe"): number {
  const cents = Math.round(amount * 100);
  return kind === "shortfall" ? Math.ceil(cents / 100) : Math.floor(cents / 100);
}

export function approxMoney(amount: number, currency: CurrencyCode, kind: "shortfall" | "safe"): string {
  return `${CURRENCY_SYMBOL[currency]}${symbolGap(currency)}${approxWhole(amount, kind)}`;
}

/** Use the Sassy line only if it passes the Sassy guardrail; otherwise the calm line. */
export function guardSassy(sassy: string, calm: string): string {
  return checkSassy(sassy).ok ? sassy : calm;
}

// ---------------------------------------------------------------------------
// Forecast lines
// ---------------------------------------------------------------------------

/** Summary line 1 (priority): the payday forecast. */
export function forecastSummaryLine(f: Forecast, tone: Tone): string {
  const date = formatDate(f.payday.nextDate);
  const days = f.assumptions.daysToPayday;
  if (f.short) {
    const amt = approxMoney(f.shortfall, f.currency, "shortfall");
    // Professional and Personal: calm and kind when short.
    const calm = `Heads up: at this pace you could be about ${amt} short before your payday on ${date}.`;
    if (tone !== "Sassy") return calm;
    return guardSassy(
      `Gurlllll what the hell are you doing? 😭 You're about ${amt} short before payday on ${date}. You don't need a self-treat, you need self-composure 💅`,
      calm
    );
  }
  const amt = approxMoney(f.safeToSpend, f.currency, "safe");
  const calm = `You're on track: about ${amt} safe to spend before your payday on ${date}.`;
  if (tone !== "Sassy") return calm;
  return guardSassy(
    `Look at you, financially responsible queen 👑 ${amt} safe to spend, ${days} day${days === 1 ? "" : "s"} to payday.`,
    calm
  );
}

/** Short ring caption for a forecast (a neutral label in every tone). */
export function forecastRingCaption(f: Forecast): string {
  const date = formatDate(f.payday.nextDate);
  if (f.short) {
    return `About ${approxMoney(f.shortfall, f.currency, "shortfall")} short before payday, ${date}`;
  }
  return `${approxMoney(f.safeToSpend, f.currency, "safe")} safe to spend, ${f.assumptions.daysToPayday} days to payday`;
}

/** The exact rule result, for "why" sheets: "£155 − (£19 × 9 days) − £23.99 = £39.99 short". */
export function forecastEquation(f: Forecast): string {
  const a = f.assumptions;
  const c = f.currency;
  const result = f.short ? `${money(f.shortfall, c)} short` : `${money(f.safeToSpend, c)} safe to spend`;
  return `${money(a.moneyUntilPayday, c)} − (${money(a.usualDailySpend, c)} × ${a.daysToPayday} days) − ${money(
    f.knownPaymentsTotal,
    c
  )} known payments = ${result}`;
}

// ---------------------------------------------------------------------------
// Habit line 2 (biggest change)
// ---------------------------------------------------------------------------

const SASSY_HABIT: Partial<Record<HabitLine["category"], string>> = {
  Takeaways: "The takeaway app knows your order by heart now 👀",
  "Eating out": "Café hopping era, no bc ✨",
  Clothes: "The new-drip era is costing us 💸",
  Transport: "You've been out and about, bestie 🫡",
  Groceries: "Fully stocked fridge era 🧾",
  Beauty: "Beauty haul energy this week 💅",
  Other: "Little bits here and there are adding up 👀",
};

export function habitSummaryLine(h: HabitLine, tone: Tone): string {
  const diff = Math.max(0, Math.round((h.recentPerDay - h.usualPerDay) * 100) / 100);
  const amt = money(diff, h.currency);
  const cat = h.category === "Other" ? "other" : h.category.toLowerCase();
  // Personal tone needs the right noun and verb: "Takeaways are", "Transport is".
  const subject = h.category === "Other" ? "Other spending" : h.category;
  const plural = ["Takeaways", "Groceries", "Clothes", "Subscriptions"].includes(h.category);
  const personal = `${subject} ${plural ? "are" : "is"} up a bit this week, about ${amt} a day more than usual.`;
  switch (tone) {
    case "Professional":
      return `Your ${cat} spending is ${amt} a day above your usual this week.`;
    case "Sassy": {
      const opener = SASSY_HABIT[h.category] ?? `Your ${cat} spending is having a moment 👀`;
      return guardSassy(`${opener} ${amt} a day above your usual this week.`, personal);
    }
    case "Personal":
    default:
      return personal;
  }
}

// ---------------------------------------------------------------------------
// Upcoming payment line 3
// ---------------------------------------------------------------------------

export function upcomingSummaryLine(u: UpcomingPayment, tone: Tone): string {
  const when = relativeWhen(u.renewsOn);
  const amt = money(u.amount, u.currency);
  const calm = `Your ${amt} subscription renews ${when}.`;
  if (tone !== "Sassy") return calm;
  return guardSassy(
    `Your ${amt} subscription renews ${when}. Do you still use it or is it just vibing in your bank statement? 🧾`,
    calm
  );
}

// ---------------------------------------------------------------------------
// Budgets and goals
// ---------------------------------------------------------------------------

export interface BudgetFacts {
  limit: number;
  spent: number;
  left: number; // negative = over
  fraction: number;
  period: BudgetPeriod;
  currency: CurrencyCode;
}

/** "this week", "this day" → noun for a budget or goal period. */
export function periodNoun(period: BudgetPeriod): string {
  return { daily: "day", weekly: "week", monthly: "month", yearly: "year" }[period];
}

/** "weekly budget", "monthly budget". */
export function periodAdjective(period: BudgetPeriod): string {
  return { daily: "daily", weekly: "weekly", monthly: "monthly", yearly: "yearly" }[period];
}

/** One status line under a budget, in tone. Budgets never change forecast numbers. */
export function budgetStatusLine(b: BudgetFacts, tone: Tone): string {
  const c = b.currency;
  const noun = periodNoun(b.period);
  const used = `${money(b.spent, c)} of ${money(b.limit, c)}`;
  if (b.left < 0) {
    const over = money(-b.left, c);
    const calm =
      tone === "Professional"
        ? `${over} over your ${money(b.limit, c)} ${periodAdjective(b.period)} budget.`
        : `You're ${over} over this ${noun}. No worries, it starts fresh.`;
    if (tone !== "Sassy") return calm;
    return guardSassy(`Okay we went ${over} over this ${noun} 🙃 Fresh start next ${noun}, bestie.`, calm);
  }
  if (b.fraction >= 0.75) {
    const calm =
      tone === "Professional"
        ? `${used} used. ${money(b.left, c)} left this ${noun}.`
        : `You've used ${used} this ${noun}. ${money(b.left, c)} left.`;
    if (tone !== "Sassy") return calm;
    const when =
      b.period === "weekly"
        ? ` and it's only ${todayWeekdayName()}`
        : b.period === "monthly"
        ? " and the month has barely started"
        : "";
    return guardSassy(`${used} gone${when} 🫠 Pace yourself, bestie.`, calm);
  }
  const calm =
    tone === "Professional"
      ? `${used} used. ${money(b.left, c)} left this ${noun}.`
      : `${money(b.left, c)} left of your ${money(b.limit, c)} this ${noun}.`;
  if (tone !== "Sassy") return calm;
  return guardSassy(`${money(b.left, c)} left this ${noun} and we're thriving ✨`, calm);
}

export function goalMetLine(amount: number, currency: CurrencyCode, period: BudgetPeriod, tone: Tone): string {
  const calm = `Goal met! ${money(amount, currency)} kept aside this ${periodNoun(period)}.`;
  if (tone !== "Sassy") return calm;
  return guardSassy(`Goal smashed. Main character energy ✨ ${money(amount, currency)} kept aside this ${periodNoun(period)}.`, calm);
}

export function goalMissedLine(tone: Tone): string {
  const calm = "No worries. Want to adjust the goal?";
  if (tone !== "Sassy") return calm;
  return guardSassy("Okay we didn't make it this time 🙃 Want to set a goal that fits real life?", calm);
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

export type ToastEvent =
  | "budgetSaved"
  | "budgetDeleted"
  | "goalSaved"
  | "goalDeleted"
  | "paydaySaved"
  | "paydayRemoved"
  | "moneySaved"
  | "cardRenamed"
  | "baseSaved"
  | "notMyPattern"
  | "cardRemoved"
  | "bankAdded"
  | "bankRemoved"
  | "bankDeleted";

const TOAST_CALM: Record<ToastEvent, string> = {
  budgetSaved: "Budget saved",
  budgetDeleted: "Budget deleted",
  goalSaved: "Goal saved",
  goalDeleted: "Goal deleted",
  paydaySaved: "Payday saved",
  paydayRemoved: "Payday removed",
  moneySaved: "Money until payday updated",
  cardRenamed: "Card renamed",
  baseSaved: "Base currency updated",
  notMyPattern: "Marked as Not my pattern",
  cardRemoved: "Card removed",
  bankAdded: "{name} added",
  bankRemoved: "{name} removed",
  bankDeleted: "{name} and its data deleted",
};

const TOAST_SASSY: Record<ToastEvent, string> = {
  budgetSaved: "Budget saved. A plan? We love to see it 💅",
  budgetDeleted: "Budget deleted 🫡",
  goalSaved: "Goal saved. Main character move ✨",
  goalDeleted: "Goal deleted 🫡",
  paydaySaved: "Payday saved 🫡",
  paydayRemoved: "Payday removed 🫡",
  moneySaved: "Updated, bestie 🫡",
  cardRenamed: "New name, who dis ✨",
  baseSaved: "Base currency updated 🫡",
  notMyPattern: "Noted, not your pattern 🫡",
  cardRemoved: "Card removed 🫡",
  bankAdded: "{name} joined the group chat ✨",
  bankRemoved: "{name} removed 🫡",
  bankDeleted: "{name} and its data deleted 🫡",
};

export function toastText(event: ToastEvent, tone: Tone, name = ""): string {
  const calm = TOAST_CALM[event].replace("{name}", name);
  if (tone !== "Sassy") return calm;
  return guardSassy(TOAST_SASSY[event].replace("{name}", name), calm);
}

// ---------------------------------------------------------------------------
// Tips (R11: never a merchant/brand name, never credit/loans/debt/investing).
// Tips are neutral options in every tone.
// ---------------------------------------------------------------------------

export function tipText(tip: Tip): string {
  switch (tip.kind) {
    case "pause-subscription":
      return `Pause your ${money(tip.amount ?? 0, tip.currency)} subscription that renews ${relativeWhen(
        tip.renewsOn ?? ""
      )}.`;
    case "set-budget":
      return `Set a budget for ${
        !tip.category || tip.category === "Other" ? "other spending" : tip.category.toLowerCase()
      } this week.`;
    case "move-payment":
      return `Move a ${money(tip.amount ?? 0, tip.currency)} payment until after payday.`;
  }
}

// ---------------------------------------------------------------------------
// Reward label (R7)
// ---------------------------------------------------------------------------

export function rewardText(amount: number, currency: CurrencyCode): string {
  return `${money(amount, currency)} cashback from a participating partner`;
}

// ---------------------------------------------------------------------------
// Tone preview examples (used in onboarding + Control)
// ---------------------------------------------------------------------------

export const TONE_PREVIEW: Record<Tone, string> = {
  Professional: "Your takeaway spending is £9 a day above your usual this week.",
  Personal: "Takeaways are up a bit this week, about £9 a day more than usual.",
  Sassy:
    "Gurlllll what the hell are you doing? 😭 You're about £40 short before payday on Fri 13 Nov. You don't need a self-treat, you need self-composure 💅",
};

// ---------------------------------------------------------------------------
// Mode 2 scaffold (optional LLM). Never required for the demo.
// ---------------------------------------------------------------------------

export interface LlmFact {
  kind: "forecast" | "habit" | "upcoming" | "tip";
  tone: Tone;
  numbers: Record<string, number | string>;
  /** The Mode 1 template output, used as fallback and as the guardrail baseline. */
  fallback: string;
}

/**
 * Mode 2: ask an LLM to phrase the given facts in the given tone, then run guardrails.
 * If the network/LLM is unavailable OR the output fails guardrails, fall back to the
 * template string. This keeps the app fully working offline (Mode 1).
 */
export async function writeWithLlm(fact: LlmFact, knownMerchants: string[]): Promise<string> {
  try {
    const endpoint = (import.meta as { env?: Record<string, string> }).env?.VITE_LLM_ENDPOINT;
    if (!endpoint) return fact.fallback;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tone: fact.tone,
        numbers: fact.numbers,
        instruction:
          "Rephrase these exact numbers in the given tone. Never change any number. " +
          "No financial advice, no credit/loans/debt/investing, no merchant names in tips.",
      }),
    });
    if (!res.ok) return fact.fallback;
    const data = (await res.json()) as { text?: string };
    const text = (data.text ?? "").trim();
    if (!text) return fact.fallback;
    const check =
      fact.kind === "tip"
        ? checkTip(text, knownMerchants)
        : fact.tone === "Sassy"
        ? checkSassy(text)
        : checkText(text);
    return check.ok ? text : fact.fallback;
  } catch {
    return fact.fallback;
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** "tomorrow", "today", or "on Fri 6 Nov". Anchored to DEMO_TODAY. */
function relativeWhen(iso: string): string {
  if (!iso) return "soon";
  const d = daysFromToday(iso);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  return `on ${formatDate(iso)}`;
}
