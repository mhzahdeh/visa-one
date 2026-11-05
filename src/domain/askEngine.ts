// askEngine.ts — answers for "Ask Visa One". Uses ONLY the user's fictional card data,
// paydays, budgets, goals and forecast numbers (R1, R9). Out-of-scope topics (loans,
// credit, debt, investing, which bank) are declined with "Ask my bank" (R2, R3).
// Tone changes the words only (R5). Sassy lines pass the Sassy guardrail or fall back.

import type { CurrencyCode, Tone } from "./config";
import { convert, rateLabel } from "./fxRates";
import { formatDate } from "./dates";
import {
  allForecasts,
  baseTotal,
  cardById,
  forecastForCurrency,
  totalForCurrency,
} from "./forecastRules";
import { approxMoney, guardSassy, money, periodNoun } from "./textWriter";
import type { AppState } from "./types";
import { budgetView } from "./planRules";

export interface Answer {
  text: string;
  how: string; // "How we worked this out"
  handoffBank?: string; // if set, show an "Ask my bank" handover card to this bank
  offerAskBank?: boolean;
  /** True when the answer says the user could be short (UI adds "Too much? Switch to Personal" in Sassy). */
  shortfall?: boolean;
}

interface Draft extends Answer {
  sassy?: string;
}

const OUT_OF_SCOPE = [
  /\bloan\b/i,
  /\bcredit\b/i,
  /\bdebt\b/i,
  /\binvest(ing|ment)?\b/i,
  /\bpay[- ]?later\b/i,
  /\bmortgage\b/i,
  /\bwhich bank\b/i,
  /\boverdraft\b/i,
];

const BANK_TOPICS = [/\bdispute\b/i, /\bfee\b/i, /\brefund\b/i, /\bfraud\b/i, /\bcharge back\b/i];

export const SUGGESTED_QUESTIONS = [
  "Why am I short this month?",
  "What subscriptions do I have?",
  "Can I afford £30 on Saturday?",
  "How am I doing on my budget?",
  "How much did I spend in euros this month?",
  "What is my total in pounds?",
];

export function answer(state: AppState, question: string, tone: Tone): Answer {
  const { sassy, ...calm } = draft(state, question);
  if (tone === "Sassy" && sassy) return { ...calm, text: guardSassy(sassy, calm.text) };
  return calm;
}

function draft(state: AppState, question: string): Draft {
  const lower = question.trim().toLowerCase();

  // Out-of-scope financial advice → decline calmly, offer Ask my bank.
  if (OUT_OF_SCOPE.some((re) => re.test(lower))) {
    return {
      text: "Visa One doesn't give advice on loans, credit, debt or investing. For that, your bank is the right place to ask.",
      sassy: "Not my department, bestie 🫡 I don't do money-product advice. That one's for your bank.",
      how: "This topic is outside what Visa One covers. Visa One only works with your own Visa card payments, paydays, budgets and goals.",
      offerAskBank: true,
      handoffBank: state.cards.find((c) => c.connected)?.bank,
    };
  }

  // Bank-only topics (disputed payment, fee) → handover card.
  if (BANK_TOPICS.some((re) => re.test(lower))) {
    const bank = state.cards.find((c) => c.connected)?.bank ?? "your bank";
    return {
      text: `That's something ${bank} handles directly. I can hand you over to them.`,
      sassy: `Ooh, that's a ${bank} thing 👀 I'll hand you over to them.`,
      how: "Disputes, fees and refunds are managed by your card's issuing bank, not by Visa One.",
      offerAskBank: true,
      handoffBank: bank,
    };
  }

  // "Why am I short this month?"
  if (/\bshort\b/.test(lower)) {
    const f = allForecasts(state).find((x) => x.short) ?? forecastForCurrency(state, "GBP");
    if (f && f.short) {
      const a = f.assumptions;
      const c = f.currency;
      const approx = approxMoney(f.shortfall, c, "shortfall");
      const payday = formatDate(f.payday.nextDate);
      const payments = a.knownPaymentsDue.map((p) => `${money(p.amount, c)} (${p.label}, ${formatDate(p.date)})`).join(", ");
      const n = a.knownPaymentsDue.length;
      return {
        text: `At this pace you could be about ${approx} short before your payday on ${payday}.`,
        sassy: `Okay so 😭 at this pace you're about ${approx} short before payday on ${payday}. Your usual spending${
          n ? ` plus ${n} renewal${n === 1 ? "" : "s"}` : ""
        } is more than the ${money(a.moneyUntilPayday, c)} you've got.`,
        how: `${money(a.moneyUntilPayday, c)} to live on − (${money(a.usualDailySpend, c)} usual daily spend × ${
          a.daysToPayday
        } days) − known payments due${payments ? ` [${payments}]` : ""} = ${money(f.shortfall, c)} short, about ${approx}. A forecast is your money now, minus what usually goes out, until money comes in.`,
        shortfall: true,
      };
    }
    return {
      text: "Good news: none of your forecasts show you short right now.",
      sassy: "Relax, bestie ✨ none of your forecasts are short right now.",
      how: "For each currency with a payday, money now − usual daily spend × days to payday − known payments is zero or above.",
    };
  }

  // "What subscriptions do I have?"
  if (/\bsubscription/.test(lower)) {
    const subs = state.upcoming;
    if (subs.length === 0) {
      return {
        text: "I can't see any upcoming subscriptions on your connected cards.",
        sassy: "No subscriptions in sight 👀 love that for you.",
        how: "Based on recurring payments found on your connected Visa cards.",
      };
    }
    const list = subs.map((u) => `${money(u.amount, u.currency)} (renews ${formatDate(u.renewsOn)})`).join(", ");
    const count = `${subs.length} upcoming subscription${subs.length > 1 ? "s" : ""}`;
    return {
      text: `You have ${count}: ${list}.`,
      sassy: `The line-up 🧾 ${count}: ${list}. Still using all of them?`,
      how: "Based on recurring payments found on your connected Visa cards and their next renewal dates.",
    };
  }

  // "Can I afford £30 on Saturday?" (amount + currency aware)
  const affordMatch = lower.match(/afford\s*[£€$]?\s*(\d+(?:\.\d+)?)/);
  if (affordMatch) {
    const amount = parseFloat(affordMatch[1]);
    const currency: CurrencyCode = lower.includes("€") ? "EUR" : lower.includes("$") ? "USD" : "GBP";
    const f = forecastForCurrency(state, currency === "USD" ? "GBP" : currency);
    if (!f) {
      return {
        text: `I can't check that without a payday in ${currency}. Add one and I'll forecast it.`,
        sassy: `I can't check that without a payday in ${currency} 🙃 Add one and I'll do the maths.`,
        how: "An affordability check needs a payday so I know how long the money has to last.",
      };
    }
    const c = f.currency;
    const payday = formatDate(f.payday.nextDate);
    const after = Math.round((f.safeToSpend - f.shortfall - amount) * 100) / 100;
    if (f.short) {
      return {
        text: `Right now you could be about ${approxMoney(f.shortfall, c, "shortfall")} short before ${payday}, so spending ${money(
          amount,
          c
        )} would stretch things further.`,
        sassy: `Bestie. No. 💀 That would put you about ${approxMoney(
          f.shortfall + amount,
          c,
          "shortfall"
        )} short before ${payday}. Sit this one out and future you will send flowers ✨`,
        how: `Your forecast is already short by ${money(f.shortfall, c)}. Adding ${money(amount, c)} makes it ${money(
          f.shortfall + amount,
          c
        )} short. Guidance, not financial advice.`,
        shortfall: true,
      };
    }
    return {
      text:
        after >= 0
          ? `Yes — after ${money(amount, c)} you'd still have about ${money(after, c)} safe to spend before ${payday}.`
          : `It's tight — ${money(amount, c)} is more than your ${money(f.safeToSpend, c)} safe-to-spend before ${payday}.`,
      sassy:
        after >= 0
          ? `Okay, you can 💅 After ${money(amount, c)} you'd still have about ${money(after, c)} safe to spend before ${payday}.`
          : `Hmm, tight 🫠 ${money(amount, c)} is more than your ${money(f.safeToSpend, c)} safe-to-spend before ${payday}.`,
      how: `Safe to spend ${money(f.safeToSpend, c)} − ${money(amount, c)} = ${money(after, c)}. Guidance, not financial advice.`,
      shortfall: after < 0,
    };
  }

  // "How am I doing on my budget?"
  if (/\bbudget\b/.test(lower)) {
    if (state.budgets.length === 0) {
      return {
        text: "You haven't set a budget yet. You can add one in Plan.",
        sassy: "No budget yet, bestie 👀 Set one in Plan and I'll keep score.",
        how: "Based on the budgets saved in your Plan screen.",
      };
    }
    const lines = state.budgets.map((b) => {
      const v = budgetView(state, b);
      return `${b.category === "All" ? "All spending" : b.category}: ${money(v.spent, b.currency)} of ${money(
        v.limit,
        b.currency
      )} this ${periodNoun(b.period)}`;
    });
    return {
      text: lines.join(". ") + ".",
      sassy: `${lines.join(". ")}. I'm watching 👀`,
      how: "Your own payments since the start of each budget's period (Monday, the 1st of the month, or 1 Jan), in its currency.",
    };
  }

  // "How much did I spend in euros this month?" / pounds / dollars
  if (/\beuro/.test(lower) || /\bpound/.test(lower) || /\bdollar/.test(lower)) {
    if (/\btotal\b/.test(lower) && /\bpound/.test(lower)) {
      const bt = baseTotal({ ...state, baseCurrency: "GBP" }, "month");
      return {
        text: `Your approximate total this month is ≈ ${money(bt.amount, "GBP")} in pounds.`,
        sassy: `All your cards together this month: ≈ ${money(bt.amount, "GBP")} in pounds 💸`,
        how: `Each currency total converted to GBP at ${bt.rateNote}, then added. The ≈ total is for display only and is never used in a forecast.`,
      };
    }
    const currency: CurrencyCode = /\beuro/.test(lower) ? "EUR" : /\bdollar/.test(lower) ? "USD" : "GBP";
    const spent = totalForCurrency(state, currency, "month");
    return {
      text: `You spent ${money(spent, currency)} in ${currency} this month.`,
      sassy: `${money(spent, currency)} in ${currency} this month 🧾 the receipts don't lie.`,
      how: `Sum of your ${currency} card payments over the last 30 days up to the demo date.`,
    };
  }

  // "What is my total in pounds?"
  if (/\btotal\b/.test(lower)) {
    const target: CurrencyCode = lower.includes("euro") ? "EUR" : lower.includes("dollar") ? "USD" : "GBP";
    const bt = baseTotal({ ...state, baseCurrency: target }, "month");
    return {
      text: `Your approximate total this month is ≈ ${money(bt.amount, target)}.`,
      sassy: `All your cards together this month: ≈ ${money(bt.amount, target)} 💸`,
      how: `Each currency total converted to ${target} at ${bt.rateNote}, then added. Display only — never used in a forecast.`,
    };
  }

  // Fallback: give the headline forecast.
  const f = forecastForCurrency(state, "GBP");
  if (f) {
    const payday = formatDate(f.payday.nextDate);
    return f.short
      ? {
          text: `Here's the headline: you could be about ${approxMoney(f.shortfall, "GBP", "shortfall")} short before ${payday}.`,
          sassy: `The headline, bestie 😭 about ${approxMoney(f.shortfall, "GBP", "shortfall")} short before payday on ${payday}.`,
          how: "Your GBP payday forecast. Try one of the suggested questions for more detail.",
          shortfall: true,
        }
      : {
          text: `Here's the headline: about ${approxMoney(f.safeToSpend, "GBP", "safe")} safe to spend before ${payday}.`,
          sassy: `The headline ✨ about ${approxMoney(f.safeToSpend, "GBP", "safe")} safe to spend before ${payday}.`,
          how: "Your GBP payday forecast. Try one of the suggested questions for more detail.",
        };
  }
  return {
    text: "Ask me about your spending, subscriptions, budget or payday forecast.",
    sassy: "Ask me about your spending, subscriptions, budget or payday, bestie ✨",
    how: "I only use your own Visa card payments, paydays, budgets and goals.",
  };
}

/** Exposed for tests: the raw converted total for a target currency this month. */
export function totalIn(state: AppState, target: CurrencyCode): number {
  const bt = baseTotal({ ...state, baseCurrency: target }, "month");
  return bt.amount;
}

export { convert, rateLabel };
export { cardById };
