// changeRequest2.test.ts — change request 2, section 6 (domain level). UI-level checks
// are in src/ui/__tests__/changeRequest2.ui.test.tsx and the browser check.

import { beforeEach, describe, expect, it } from "vitest";
import type { Tone } from "../config";
import { buildSeedState } from "../../state/initialState";
import { addBank, removeBank, deleteBankData, saveBudget } from "../../state/store";
import {
  allForecasts,
  anyForecastShort,
  baseTotal,
  cardBreakdowns,
  currenciesWithSpend,
  forecastForCurrency,
  totalForCurrency,
  type HabitLine,
} from "../forecastRules";
import {
  budgetStatusLine,
  forecastSummaryLine,
  goalMetLine,
  goalMissedLine,
  guardSassy,
  habitSummaryLine,
  toastText,
  upcomingSummaryLine,
  type ToastEvent,
} from "../textWriter";
import { answer, SUGGESTED_QUESTIONS } from "../askEngine";
import { checkSassy, countEmoji } from "../guardrails";
import { budgetView, perDayOf, suggestedBudget } from "../planRules";
import { periodDaysLeft } from "../dates";
import { convert } from "../fxRates";
import type { AppState, SpendCategory } from "../types";

let state: AppState;
beforeEach(() => {
  state = buildSeedState();
});

const gbpShort = () => forecastForCurrency(state, "GBP")!;
const onTrack = () => ({ ...state, moneyUntilPayday: { ...state.moneyUntilPayday, GBP: 400 } });

const habit = (category: SpendCategory): HabitLine => ({
  category,
  currency: "GBP",
  perDay: 10,
  perWeek: 70,
  perMonth: 300,
  trend: "up",
  recentPerDay: 19,
  usualPerDay: 10,
  count: 8,
  windowDays: 28,
});

const TOASTS: ToastEvent[] = [
  "budgetSaved",
  "budgetDeleted",
  "goalSaved",
  "goalDeleted",
  "paydaySaved",
  "paydayRemoved",
  "moneySaved",
  "cardRenamed",
  "baseSaved",
  "notMyPattern",
  "cardRemoved",
  "bankAdded",
  "bankRemoved",
  "bankDeleted",
];

const ASK = [
  ...SUGGESTED_QUESTIONS,
  "Can I afford £5 on Saturday?",
  "Should I take out a loan or start investing?",
  "I want to dispute a fee",
  "What's the headline?",
];

/** Every AI string the app can produce, in one tone. */
function allTexts(tone: Tone, s: AppState = state): string[] {
  const withBudget = saveBudget(s, { id: "b1", category: "All", currency: "GBP", limit: 80, period: "weekly" });
  const facts = (spent: number, limit = 80) => ({
    limit,
    spent,
    left: limit - spent,
    fraction: spent / limit,
    period: "weekly" as const,
    currency: "GBP" as const,
  });
  const categories: SpendCategory[] = ["Takeaways", "Groceries", "Transport", "Clothes", "Beauty", "Eating out", "Other"];
  return [
    forecastSummaryLine(forecastForCurrency(s, "GBP")!, tone),
    forecastSummaryLine(forecastForCurrency(onTrack(), "GBP")!, tone),
    forecastSummaryLine(forecastForCurrency(s, "EUR")!, tone),
    ...categories.map((c) => habitSummaryLine(habit(c), tone)),
    ...s.upcoming.map((u) => upcomingSummaryLine(u, tone)),
    budgetStatusLine(facts(20), tone),
    budgetStatusLine(facts(62), tone),
    budgetStatusLine(facts(92), tone),
    budgetStatusLine({ ...facts(250, 400), period: "monthly" }, tone),
    goalMetLine(50, "GBP", "monthly", tone),
    goalMissedLine(tone),
    ...TOASTS.map((t) => toastText(t, tone, "Nordlys Bank")),
    ...ASK.map((q) => answer(s, q, tone).text),
    ...ASK.map((q) => answer(withBudget, q, tone).text),
    ...ASK.map((q) => answer(onTrack(), q, tone).text),
  ];
}

describe("Sassy stays sassy when short (new R5)", () => {
  it("summary is sassy, has emoji, and states about £40 and Fri 13 Nov", () => {
    const line = forecastSummaryLine(gbpShort(), "Sassy");
    expect(line).toBe(
      "Gurlllll what the hell are you doing? 😭 You're about £40 short before payday on Fri 13 Nov. You don't need a self-treat, you need self-composure 💅"
    );
    expect(countEmoji(line)).toBeGreaterThanOrEqual(1);
    expect(line).toContain("about £40");
    expect(line).toContain("Fri 13 Nov");
  });

  it("Professional and Personal are calm and contain no emoji when short", () => {
    for (const tone of ["Professional", "Personal"] as Tone[]) {
      const line = forecastSummaryLine(gbpShort(), tone);
      expect(line).toBe("Heads up: at this pace you could be about £40 short before your payday on Fri 13 Nov.");
      expect(countEmoji(line)).toBe(0);
    }
  });

  it("no Professional or Personal text anywhere contains an emoji", () => {
    for (const tone of ["Professional", "Personal"] as Tone[]) {
      for (const text of allTexts(tone)) expect(countEmoji(text), text).toBe(0);
    }
  });

  it("uses the brief's Sassy templates", () => {
    expect(habitSummaryLine({ ...habit("Takeaways"), recentPerDay: 19, usualPerDay: 10 }, "Sassy")).toBe(
      "The takeaway app knows your order by heart now 👀 £9 a day above your usual this week."
    );
    expect(upcomingSummaryLine(state.upcoming[0], "Sassy")).toBe(
      "Your £12.99 subscription renews tomorrow. Do you still use it or is it just vibing in your bank statement? 🧾"
    );
    expect(budgetStatusLine({ limit: 80, spent: 62, left: 18, fraction: 62 / 80, period: "weekly", currency: "GBP" }, "Sassy")).toBe(
      "£62 of £80 gone and it's only Wednesday 🫠 Pace yourself, bestie."
    );
    expect(goalMetLine(50, "GBP", "monthly", "Sassy")).toBe("Goal smashed. Main character energy ✨ £50 kept aside this month.");
    expect(goalMissedLine("Sassy")).toBe("Okay we didn't make it this time 🙃 Want to set a goal that fits real life?");
    expect(answer(state, "Can I afford £30 on Saturday?", "Sassy").text).toBe(
      "Bestie. No. 💀 That would put you about £70 short before Fri 13 Nov. Sit this one out and future you will send flowers ✨"
    );
    const okLine = forecastSummaryLine(forecastForCurrency(onTrack(), "GBP")!, "Sassy");
    expect(okLine).toMatch(/^Look at you, financially responsible queen 👑 £\d+ safe to spend, 9 days to payday\.$/);
  });
});

describe("every Sassy text passes the Sassy guardrail", () => {
  it("no advice, shaming, income/body/looks, swear words or spending pushes; 1 to 3 emojis", () => {
    const texts = allTexts("Sassy");
    expect(texts.length).toBeGreaterThan(50);
    for (const text of texts) {
      const check = checkSassy(text);
      expect(check.reasons, text).toEqual([]);
    }
  });

  it("the guardrail blocks what it should and allows mild 'what the hell'", () => {
    const blocked = [
      "You're broke 💀",
      "Such a loser move 😭",
      "That's pathetic 🙃",
      "Holy shit 💀",
      "Hell yeah 💅",
      "Damn, bestie 😭",
      "Just borrow it 💸",
      "Apply for a credit card ✨",
      "Treat yourself 💅",
      "Your income is tiny 😭",
      "No emoji at all",
      "Too many 😭😭😭😭",
    ];
    for (const t of blocked) expect(checkSassy(t).ok, t).toBe(false);
    expect(checkSassy("Gurlllll what the hell are you doing? 😭").ok).toBe(true);
  });

  it("a Sassy line that fails the guardrail falls back to the calm line", () => {
    expect(guardSassy("You're broke 💀", "Calm line.")).toBe("Calm line.");
  });
});

describe("rewards stay hidden when short in every tone (R4 unchanged)", () => {
  it("the seed forecast is short, so rewards are hidden regardless of tone", () => {
    for (const tone of ["Professional", "Personal", "Sassy"] as Tone[]) {
      expect(anyForecastShort({ ...state, tone })).toBe(true);
    }
  });
});

describe("budgets (planRules)", () => {
  it("suggests a weekly budget from the forecast: (155 − 23.99) ÷ 9 × 7 = 101.90 → £100", () => {
    expect(suggestedBudget(state, "GBP", "weekly")).toBe(100);
  });
  it("previews £80 a week as about £11 a day, and counts 4 days to go on Wed 4 Nov", () => {
    expect(perDayOf(80, "weekly")).toBe(11);
    expect(periodDaysLeft("weekly")).toBe(4);
    expect(periodDaysLeft("monthly")).toBe(26);
  });
  it("counts the current calendar period: a weekly budget on Wed 4 Nov counts from Mon 2 Nov", () => {
    const b = { id: "b", category: "All" as const, currency: "GBP" as const, limit: 100, period: "weekly" as const };
    const fromMonday = state.transactions
      .filter((t) => t.currency === "GBP" && t.date >= "2026-11-02" && t.date <= "2026-11-04")
      .reduce((s, t) => s + t.amount, 0);
    const v = budgetView(state, b);
    expect(v.spent).toBeCloseTo(fromMonday, 2);
    expect(v.left).toBeCloseTo(100 - fromMonday, 2);
    expect(v.daysLeft).toBe(4);
    // Last week's payments (Sat 31 Oct beauty £34) do not count this week, but still count in totals.
    const marked = { ...state, transactions: state.transactions.map((t) => (t.merchant === "GlowRoom" ? { ...t, date: "2026-11-03" } : t)) };
    expect(budgetView(marked, b).spent).toBeCloseTo(fromMonday + 34, 2);
  });

  it("a budget never changes the forecast", () => {
    const before = gbpShort().projected;
    const after = forecastForCurrency(saveBudget(state, { id: "b", category: "All", currency: "GBP", limit: 10, period: "weekly" }), "GBP")!.projected;
    expect(after).toBe(before);
  });
});

describe("banks (change request 2, section 5)", () => {
  it("adding Nordlys Bank adds a NOK card, a NOK currency line and NOK in the ≈ total; the GBP forecast is unchanged", () => {
    const gbpBefore = gbpShort();
    const next = addBank(state, "nordlys", ["card-nordlys"]);
    const card = next.cards.find((c) => c.id === "card-nordlys")!;
    expect(card.connected).toBe(true);
    expect(card.currency).toBe("NOK");
    expect(currenciesWithSpend(next, "month")).toContain("NOK");
    const nok = totalForCurrency(next, "NOK", "month");
    expect(nok).toBeGreaterThan(0);
    expect(cardBreakdowns(next, "month").some((r) => r.card.id === "card-nordlys")).toBe(true);
    const bt = baseTotal(next, "month");
    expect(bt.rateNote).toContain("kr\u20091 = £0.072");
    const expected = baseTotal(state, "month").amount + convert(nok, "NOK", "GBP");
    expect(bt.amount).toBeCloseTo(expected, 1);
    const gbpAfter = forecastForCurrency(next, "GBP")!;
    expect(gbpAfter.projected).toBe(gbpBefore.projected);
    expect(gbpAfter.shortfall).toBeCloseTo(39.99, 2);
  });

  it("removing Riverside drops it from totals but keeps its history, so it can be added back", () => {
    const riverside = totalForCurrency(state, "GBP", "month");
    const removed = removeBank(state, "Riverside");
    expect(removed.cards.find((c) => c.bank === "Riverside")!.connected).toBe(false);
    expect(totalForCurrency(removed, "GBP", "month")).toBeLessThan(riverside);
    expect(removed.transactions.filter((t) => t.cardId === "card-riverside").length).toBeGreaterThan(0);
    const back = addBank(removed, "riverside", ["card-riverside"]);
    expect(totalForCurrency(back, "GBP", "month")).toBe(riverside);
  });

  it("deleting a bank's data erases its cards and payments", () => {
    const deleted = deleteBankData(state, "Riverside");
    expect(deleted.cards.some((c) => c.bank === "Riverside")).toBe(false);
    expect(deleted.transactions.some((t) => t.cardId === "card-riverside")).toBe(false);
  });

  it("Demo reset returns the three seed banks and the original numbers", () => {
    let s = addBank(state, "nordlys", ["card-nordlys"]);
    s = removeBank(s, "Riverside");
    expect(s.cards.filter((c) => c.connected).map((c) => c.bank)).not.toContain("Riverside");
    const fresh = buildSeedState();
    expect([...new Set(fresh.cards.map((c) => c.bank))]).toEqual(["Northbank", "Riverside", "Banco Solano"]);
    expect(forecastForCurrency(fresh, "GBP")!.shortfall).toBeCloseTo(39.99, 2);
    expect(allForecasts(fresh).map((f) => f.currency).sort()).toEqual(["EUR", "GBP"]);
  });
});
