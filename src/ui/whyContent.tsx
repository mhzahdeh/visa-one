// whyContent.tsx — builds the "why" sheet content for each kind of insight (R8):
// it names the rule, the payments and the dates used. Numbers come from forecastRules.

import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { formatDate } from "../domain/dates";
import type { Forecast, HabitLine, Tip } from "../domain/forecastRules";
import { approxMoney, forecastEquation, money, toastText } from "../domain/textWriter";
import type { AppState, Goal, UpcomingPayment } from "../domain/types";
import { updatePayday, useStore } from "../state/store";
import { Money } from "./Money";
import { AmountInput } from "./Field";
import { DatePicker } from "./DatePicker";
import { useToast } from "./Toast";
import { ICON } from "./icons";
import type { WhyContent } from "./WhySheet";

export const FORECAST_PRINCIPLE =
  "A forecast is your money now, minus what usually goes out, until money comes in.";

function MathRow({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? "border-t border-line pt-2 font-semibold" : ""}`}>
      <span className={strong ? "text-ink" : "text-slate"}>{label}</span>
      <span className="text-ink">{children}</span>
    </div>
  );
}

/** Tappable value in the maths: tap to edit inline (change request 2, section 4). */
function EditValue({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-input px-2 font-semibold text-visa-blue underline decoration-visa-blue/30 underline-offset-4"
    >
      {children}
      <Pencil size={14} strokeWidth={ICON.stroke} aria-hidden />
    </button>
  );
}

export function ForecastMaths({ f }: { f: Forecast }) {
  const { state, setState } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<"money" | "date" | null>(null);
  const snapshot = useRef<Pick<AppState, "moneyUntilPayday" | "paydays"> | null>(null);
  const a = f.assumptions;
  const c = f.currency;

  const start = (what: "money" | "date") => {
    snapshot.current = { moneyUntilPayday: state.moneyUntilPayday, paydays: state.paydays };
    setEditing(what);
  };
  const done = (message: string) => {
    const prev = snapshot.current;
    setEditing(null);
    if (prev) toast({ message, actionLabel: "Undo", onAction: () => setState((s) => ({ ...s, ...prev })) });
  };

  return (
    <div className="text-label font-normal">
      {editing === "money" ? (
        <div className="py-1.5">
          <AmountInput
            label="Money you have until payday"
            currency={c}
            value={a.moneyUntilPayday}
            autoFocus
            onChange={(v) => setState((s) => ({ ...s, moneyUntilPayday: { ...s.moneyUntilPayday, [c]: v } }))}
            onDone={() => done(toastText("moneySaved", state.tone))}
          />
        </div>
      ) : (
        <MathRow label="Money you said you have">
          <EditValue label={`Edit money you have, ${money(a.moneyUntilPayday, c)}`} onClick={() => start("money")}>
            <Money amount={a.moneyUntilPayday} currency={c} />
          </EditValue>
        </MathRow>
      )}
      {editing === "date" ? (
        <div className="py-1.5">
          <DatePicker
            label={`Next payday: ${f.payday.name}`}
            value={f.payday.nextDate}
            onChange={(iso) => {
              setState((s) => updatePayday(s, f.payday.id, { nextDate: iso }));
              done(toastText("paydaySaved", state.tone));
            }}
          />
        </div>
      ) : (
        <MathRow label={`Payday, ${f.payday.name}`}>
          <EditValue label={`Edit payday date, ${formatDate(f.payday.nextDate)}`} onClick={() => start("date")}>
            {formatDate(f.payday.nextDate)}
          </EditValue>
        </MathRow>
      )}
      <MathRow label={`Usual daily spend ${money(a.usualDailySpend, c)} × ${a.daysToPayday} days`}>
        <Money amount={a.usualDailySpend * a.daysToPayday} currency={c} prefix="−" />
      </MathRow>
      {a.knownPaymentsDue.map((p) => (
        <MathRow key={p.label + p.date} label={`${p.label}, due ${formatDate(p.date)}`}>
          <Money amount={p.amount} currency={c} prefix="−" />
        </MathRow>
      ))}
      <MathRow label={f.short ? `Short before ${formatDate(f.payday.nextDate)}` : `Safe to spend until ${formatDate(f.payday.nextDate)}`} strong>
        <Money amount={f.short ? f.shortfall : f.safeToSpend} currency={c} />
      </MathRow>
      <p className="mt-2 text-caption text-slate">Tap the amount or the date to change it. The numbers update as you type.</p>
      <p className="mt-1 text-caption text-slate">
        {f.short
          ? `Shown as “about ${approxMoney(f.shortfall, c, "shortfall")}”: we round a shortfall up, never down.`
          : `Shown as “${approxMoney(f.safeToSpend, c, "safe")}”: we round safe-to-spend down, never up.`}
      </p>
    </div>
  );
}

export function forecastWhy(f: Forecast, forText: string, kind: WhyContent["kind"] = "insight"): WhyContent {
  const payments = f.assumptions.knownPaymentsDue
    .map((p) => `${p.label} ${money(p.amount, f.currency)} on ${formatDate(p.date)}`)
    .join(", ");
  return {
    kind,
    forText,
    rule: "forecastRules.forecastForCurrency",
    detail: <ForecastMaths f={f} />,
    detailText: `${forecastEquation(f)}.${payments ? ` Payments used: ${payments}.` : ""} Payday ${f.payday.name}, ${formatDate(f.payday.nextDate)}.`,
    principle: FORECAST_PRINCIPLE,
  };
}

export function habitWhy(h: HabitLine, forText: string, kind: WhyContent["kind"] = "insight"): WhyContent {
  const text = `Based on ${h.count} ${h.category.toLowerCase()} payments in the last 4 weeks. Last 7 days ${money(
    h.recentPerDay,
    h.currency
  )} a day, the 3 weeks before ${money(h.usualPerDay, h.currency)} a day, so the trend is ${h.trend}. Payments marked “Not my pattern” are left out.`;
  return {
    kind,
    forText,
    rule: "forecastRules.habitLines",
    detail: <p className="text-label font-normal">{text}</p>,
    detailText: text,
    principle: "Up or down is compared with your own usual, never with anyone else.",
  };
}

export function upcomingWhy(u: UpcomingPayment, cardLabel: string, forText: string): WhyContent {
  const text = `A repeating ${money(u.amount, u.currency)} payment on your ${cardLabel} card. Its next renewal is ${formatDate(u.renewsOn)}.`;
  return {
    kind: "summary",
    forText,
    rule: "forecastRules.nextUpcoming",
    detail: <p className="text-label font-normal">{text}</p>,
    detailText: text,
    principle: "Known payments are part of every forecast, so they never surprise you.",
  };
}

export function tipWhy(tip: Tip, forText: string): WhyContent {
  const text =
    tip.kind === "pause-subscription"
      ? `A repeating ${money(tip.amount ?? 0, tip.currency)} payment renews ${formatDate(tip.renewsOn ?? "")}, before your payday.`
      : tip.kind === "set-budget"
      ? `${tip.category} is your biggest rising habit, about ${money(tip.amount ?? 0, tip.currency)} a week, from your own payments.`
      : `A ${money(tip.amount ?? 0, tip.currency)} payment falls on ${formatDate(tip.renewsOn ?? "")}, before payday, while your forecast is short.`;
  return {
    kind: "tip",
    forText,
    rule: "forecastRules.tipOpportunities",
    detail: <p className="text-label font-normal">{text}</p>,
    detailText: text,
    principle: "Tips come only from your own payments. They never name a brand and are never paid for.",
  };
}

export function rewardWhy(goal: Goal, forText: string): WhyContent {
  const text = `You met your ${goal.period} goal “${goal.name}”. Rewards only come from weekly, monthly or yearly goals, only when you have switched rewards on, and never while a forecast is short.`;
  return {
    kind: "reward",
    forText,
    rule: "forecastRules.goalUnlocksReward",
    detail: <p className="text-label font-normal">{text}</p>,
    detailText: text,
    principle: "Partners never see you or your payments.",
  };
}
