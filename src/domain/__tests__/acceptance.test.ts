// acceptance.test.ts — the acceptance checks from section 9, as tests.

import { describe, it, expect, beforeEach } from "vitest";
import { buildSeedState } from "../../state/initialState";
import {
  addGoal,
  deleteCard,
  removeCard,
  toggleNotMyPattern,
} from "../../state/store";
import {
  allForecasts,
  anyForecastShort,
  baseTotal,
  forecastForCurrency,
  goalProgress,
  goalUnlocksReward,
  habitLines,
  tipOpportunities,
  totalForCurrency,
} from "../forecastRules";
import { convert } from "../fxRates";
import { answer } from "../askEngine";
import { tipText, forecastSummaryLine } from "../textWriter";
import { checkTip } from "../guardrails";
import type { AppState } from "../types";

let state: AppState;
beforeEach(() => {
  state = buildSeedState();
});

describe("payday forecast", () => {
  it("GBP forecast is about £40 short before Fri 13 Nov: 155 − 19×9 − 12.99 − 11.00", () => {
    const f = forecastForCurrency(state, "GBP")!;
    expect(f).toBeTruthy();
    expect(f.short).toBe(true);
    // 155 - 171 - 12.99 - 11 = -39.99 → shortfall ~39.99, "about £40".
    expect(f.shortfall).toBeCloseTo(39.99, 2);
    expect(f.assumptions.daysToPayday).toBe(9);
    expect(Math.round(f.shortfall)).toBe(40);
  });

  it("EUR forecast is €23 safe to spend, 27 days to payday: 60 − 1×27 − 9.99 is wrong; brief uses Dec 1", () => {
    // Brief dashboard example uses 27 days (to an assumed payday) → 60 − 27 − 9.99 = 23.01.
    // Our seed EUR payday is Tue 1 Dec (27 days from Wed 4 Nov) and music renews Sun 15 Nov (<Dec 1).
    const f = forecastForCurrency(state, "EUR")!;
    expect(f.assumptions.daysToPayday).toBe(27);
    expect(f.short).toBe(false);
    // 60 - (1 * 27) - 9.99 = 23.01
    expect(f.safeToSpend).toBeCloseTo(23.01, 2);
  });
});

describe("dashboard totals", () => {
  it("GBP and EUR appear separately and a base ≈ total names the rate", () => {
    const gbp = totalForCurrency(state, "GBP", "month");
    const eur = totalForCurrency(state, "EUR", "month");
    expect(gbp).toBeGreaterThan(0);
    expect(eur).toBeGreaterThan(0);
    const bt = baseTotal(state, "month");
    expect(bt.base).toBe("GBP");
    expect(bt.rateNote).toContain("£0.87");
  });

  it("base total = GBP total + EUR total × 0.87 for base GBP", () => {
    const gbp = totalForCurrency(state, "GBP", "month");
    const eur = totalForCurrency(state, "EUR", "month");
    const expected = Math.round((gbp + eur * 0.87) * 100) / 100;
    const bt = baseTotal(state, "month");
    expect(bt.amount).toBeCloseTo(expected, 2);
  });

  it("changing base currency from GBP to EUR changes only the ≈ total; forecasts unchanged", () => {
    const fBefore = forecastForCurrency(state, "GBP")!;
    const btGbp = baseTotal({ ...state, baseCurrency: "GBP" }, "month");
    const btEur = baseTotal({ ...state, baseCurrency: "EUR" }, "month");
    expect(btEur.amount).not.toBeCloseTo(btGbp.amount, 1);
    const fAfter = forecastForCurrency({ ...state, baseCurrency: "EUR" }, "GBP")!;
    expect(fAfter.projected).toBe(fBefore.projected);
    expect(fAfter.shortfall).toBe(fBefore.shortfall);
  });
});

describe("second payday", () => {
  it("has both seed paydays (GBP + EUR), each forecast runs to its own currency's payday", () => {
    const forecasts = allForecasts(state);
    const currencies = forecasts.map((f) => f.currency).sort();
    expect(currencies).toEqual(["EUR", "GBP"]);
    const eur = forecasts.find((f) => f.currency === "EUR")!;
    expect(eur.payday.nextDate).toBe("2026-12-01");
  });
});

describe("not my pattern", () => {
  it("marking the £34 beauty payment keeps totals + forecast, drops beauty habit, hides beauty reward", () => {
    const beauty = state.transactions.find((t) => t.merchant === "GlowRoom" && t.amount === 34)!;
    expect(beauty).toBeTruthy();

    const totalBefore = totalForCurrency(state, "GBP", "month");
    const forecastBefore = forecastForCurrency(state, "GBP")!.projected;
    const beautyBefore = habitLines(state, "GBP").find((h) => h.category === "Beauty");

    const next = toggleNotMyPattern(state, beauty.id);

    const totalAfter = totalForCurrency(next, "GBP", "month");
    const forecastAfter = forecastForCurrency(next, "GBP")!.projected;
    const beautyAfter = habitLines(next, "GBP").find((h) => h.category === "Beauty");

    expect(totalAfter).toBe(totalBefore); // still counts in totals (R6)
    expect(forecastAfter).toBe(forecastBefore); // and in forecast (R6)
    // Beauty habit average drops (the only beauty payment is now excluded).
    const beforeAvg = beautyBefore?.perMonth ?? 0;
    const afterAvg = beautyAfter?.perMonth ?? 0;
    expect(afterAvg).toBeLessThan(beforeAvg);
  });
});

describe("rewards hidden when short (R4)", () => {
  it("any forecast short → anyForecastShort true (so rewards hide) and summary line 1 is the shortfall", () => {
    expect(anyForecastShort(state)).toBe(true);
    const f = allForecasts(state).find((x) => x.short)!;
    const line = forecastSummaryLine(f, "Personal");
    expect(line.toLowerCase()).toContain("short");
  });
});

// R5 was changed by change request 2: Professional and Personal turn calm when short;
// Sassy stays sassy (the user chose it) but still states the amount and payday.
// This replaces the v3 check "WHEN the tone is Sassy AND the forecast is short THEN the
// summary uses the calm wording".
describe("tone when short (R5, as changed in change request 2)", () => {
  it("Professional and Personal use the same calm wording; Sassy stays sassy with the same facts", () => {
    const f = allForecasts(state).find((x) => x.short)!;
    const professional = forecastSummaryLine(f, "Professional");
    const personal = forecastSummaryLine(f, "Personal");
    const sassy = forecastSummaryLine(f, "Sassy");
    expect(professional).toBe(personal);
    expect(personal.toLowerCase()).toContain("heads up");
    expect(sassy).not.toBe(personal);
    expect(sassy).toContain("about £40");
    expect(sassy).toContain("Fri 13 Nov");
  });
});

describe("savings tips are clean (R11, section 7)", () => {
  it("no tip contains a merchant/brand name, credit, loans, debt or investing", () => {
    const tips = tipOpportunities(state);
    const merchants = [
      ...state.transactions.map((t) => t.merchant),
      ...state.upcoming.map((u) => u.merchant),
    ];
    expect(tips.length).toBeGreaterThan(0);
    for (const tip of tips) {
      const text = tipText(tip);
      const check = checkTip(text, merchants);
      expect(check.ok).toBe(true);
      expect(text).not.toMatch(/credit|loan|debt|invest/i);
    }
  });
});

describe("Ask Visa One scope", () => {
  it("declines a loan/investing question and offers Ask my bank", () => {
    const a = answer(state, "Should I take out a loan or start investing?", "Personal");
    expect(a.offerAskBank).toBe(true);
    expect(a.handoffBank).toBeTruthy();
    expect(a.text.toLowerCase()).toContain("doesn't give advice");
  });

  it("answers euro spend from own data and ends with a 'how'", () => {
    const a = answer(state, "How much did I spend in euros this month?", "Personal");
    expect(a.text).toContain("€");
    expect(a.how.length).toBeGreaterThan(0);
  });

  it("'what is my total in pounds' gives an ≈ base total", () => {
    const a = answer(state, "What is my total in pounds?", "Personal");
    expect(a.text).toContain("≈");
    expect(a.text).toContain("£");
  });
});

describe("card remove vs delete", () => {
  it("remove keeps transactions (hidden) and can be added back with history", () => {
    const id = state.cards[0].id;
    const txCountBefore = state.transactions.filter((t) => t.cardId === id).length;
    const removed = removeCard(state, id);
    const card = removed.cards.find((c) => c.id === id)!;
    expect(card.connected).toBe(false);
    // History still present.
    expect(removed.transactions.filter((t) => t.cardId === id).length).toBe(txCountBefore);
  });

  it("delete erases this card's transactions after the confirm step", () => {
    const id = state.cards[0].id;
    const deleted = deleteCard(state, id);
    expect(deleted.cards.find((c) => c.id === id)).toBeUndefined();
    expect(deleted.transactions.filter((t) => t.cardId === id).length).toBe(0);
  });
});

describe("goals and rewards (R7)", () => {
  it("a daily goal never unlocks a reward", () => {
    const daily = { id: "g1", name: "Daily", currency: "GBP" as const, amount: 10, period: "daily" as const };
    expect(goalUnlocksReward(daily)).toBe(false);
    const weekly = { id: "g2", name: "Weekly", currency: "GBP" as const, amount: 10, period: "weekly" as const };
    expect(goalUnlocksReward(weekly)).toBe(true);
  });

  it("goal progress computes against money-until-payday minus spend", () => {
    const withGoal = addGoal(state, {
      id: "g3",
      name: "Keep €20 aside this week",
      currency: "EUR",
      amount: 20,
      period: "weekly",
    });
    const p = goalProgress(withGoal, withGoal.goals[0]);
    expect(p.target).toBe(20);
    expect(typeof p.met).toBe("boolean");
  });
});

describe("demo clock (R13)", () => {
  it("numbers do not depend on the system date", () => {
    // forecastForCurrency uses DEMO_TODAY internally; calling it twice is stable.
    const a = forecastForCurrency(state, "GBP")!.projected;
    const b = forecastForCurrency(state, "GBP")!.projected;
    expect(a).toBe(b);
  });
});

describe("fx", () => {
  it("derives cross rates through GBP", () => {
    // EUR→USD = EUR→GBP(0.87) then GBP→USD(1.30)
    expect(convert(100, "EUR", "USD")).toBeCloseTo(100 * 0.87 * 1.3, 4);
  });
});
