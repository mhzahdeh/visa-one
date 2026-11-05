// Plan.tsx — the main budget first (change request 2), then other budgets and goals,
// the forecast detail per currency, savings tips and Partner rewards (hidden when short, R4).

import { useState } from "react";
import { CalendarDays, Gift, Lightbulb, PartyPopper, Plus, Target, TriangleAlert, Wallet } from "lucide-react";
import type { CurrencyCode } from "../domain/config";
import { formatDate } from "../domain/dates";
import {
  USUAL_DAILY_SPEND,
  allForecasts,
  anyForecastShort,
  forecastForCurrency,
  goalProgress,
  goalUnlocksReward,
  tipOpportunities,
  type Forecast,
} from "../domain/forecastRules";
import { budgetView, mainBudget, type BudgetView } from "../domain/planRules";
import {
  approxMoney,
  budgetStatusLine,
  goalMetLine,
  goalMissedLine,
  money,
  periodAdjective,
  periodNoun,
  rewardText,
  tipText,
} from "../domain/textWriter";
import { checkTip } from "../domain/guardrails";
import type { Budget, Goal } from "../domain/types";
import { useStore } from "../state/store";
import { AppHeader } from "../ui/AppHeader";
import { Card, CardHeader, Eyebrow, Stack } from "../ui/Card";
import { StatusChip } from "../ui/Chip";
import { List, ListRow, RowIcon } from "../ui/ListRow";
import { Money } from "../ui/Money";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import { Slider } from "../ui/Slider";
import { WhyButton } from "../ui/WhySheet";
import { forecastWhy, rewardWhy, tipWhy } from "../ui/whyContent";
import { color } from "../ui/tokens";
import { ICON } from "../ui/icons";
import { BudgetSheet, GoalSheet, categoryLabel } from "../sheets/PlanSheets";
import { MoneySheet } from "../sheets/MoneySheet";
import { PaydaySheet } from "../sheets/PaydaySheet";

export function Plan() {
  const { state } = useStore();
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [newBudget, setNewBudget] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [newGoal, setNewGoal] = useState(false);
  const main = mainBudget(state);
  const others = state.budgets.filter((b) => b.id !== main?.id);

  return (
    <div>
      <AppHeader title="Plan" caption="Your budget, goals and forecast." />
      <Stack>
        {main ? <BudgetHero view={budgetView(state, main)} onEdit={() => setEditBudget(main)} /> : <FirstBudget onStart={() => setNewBudget(true)} />}

        {(others.length > 0 || state.goals.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {others.map((b) => (
              <CompactBudget key={b.id} view={budgetView(state, b)} onEdit={() => setEditBudget(b)} />
            ))}
            {state.goals.map((g) => (
              <CompactGoal key={g.id} goal={g} onEdit={() => setEditGoal(g)} />
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" icon={<Plus size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden />} onClick={() => setNewBudget(true)}>
            Add budget
          </Button>
          <Button variant="secondary" icon={<Plus size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden />} onClick={() => setNewGoal(true)}>
            Add goal
          </Button>
        </div>

        {allForecasts(state).map((f) => (
          <ForecastDetail key={f.currency} currency={f.currency} />
        ))}
        <Tips />
        <Rewards />
      </Stack>

      <BudgetSheet open={editBudget !== null} budget={editBudget ?? undefined} onClose={() => setEditBudget(null)} />
      <BudgetSheet open={newBudget} prefill={{ category: "All", period: "weekly", currency: "GBP" }} onClose={() => setNewBudget(false)} />
      <GoalSheet open={editGoal !== null} goal={editGoal ?? undefined} onClose={() => setEditGoal(null)} />
      <GoalSheet open={newGoal} onClose={() => setNewGoal(false)} />
    </div>
  );
}

// Budget hero: the main budget, big and clear, visible without scrolling ------------------
export function BudgetHero({ view, onEdit }: { view: BudgetView; onEdit: () => void }) {
  const { state } = useStore();
  const v = view;
  const over = v.left < 0;
  const daysText = v.daysLeft === 0 ? "ends today" : `${v.daysLeft} day${v.daysLeft === 1 ? "" : "s"} to go`;
  return (
    <button
      type="button"
      onClick={onEdit}
      data-testid="budget-hero"
      aria-label={`Your budget: ${money(v.limit, v.currency)} ${periodAdjective(v.period)}, ${over ? `${money(-v.left, v.currency)} over` : `${money(v.left, v.currency)} left`}, ${daysText}. Edit`}
      className="block w-full rounded-card bg-hero p-5 text-left text-white shadow-card"
    >
      <div className="flex items-center justify-between">
        <Eyebrow onDark>Your budget · {categoryLabel(v.budget.category)}</Eyebrow>
        <span className="text-caption text-white/70">Tap to edit</span>
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
        <span className="text-display">
          <Money amount={v.limit} currency={v.currency} />
        </span>
        <span className="text-heading">{periodAdjective(v.period)} budget</span>
      </p>
      <p className="tabular mt-1 text-body" data-testid="budget-hero-left">
        {over ? `${money(-v.left, v.currency)} over` : `${money(v.left, v.currency)} left`} · {daysText}
      </p>
      <div
        className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/15"
        role="progressbar"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(1, v.fraction) * 100)}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-150 ${v.status === "headsup" ? "bg-headsup" : "bg-ok"}`}
          style={{ width: `${Math.round(Math.min(1, v.fraction) * 100)}%` }}
        />
      </div>
      <p className="mt-3 flex items-start gap-2 text-label font-normal text-white">
        {v.status === "headsup" && <TriangleAlert size={16} strokeWidth={ICON.stroke} className="mt-0.5 shrink-0 text-headsup" aria-hidden />}
        <span>{budgetStatusLine(v, state.tone)}</span>
      </p>
      <p className="mt-2 text-caption text-white/70">
        Counts your payments {v.period === "weekly" ? "since Monday" : v.period === "monthly" ? "since the 1st" : v.period === "yearly" ? "since 1 Jan" : "today"}. A
        budget never changes your forecast.
      </p>
    </button>
  );
}

function FirstBudget({ onStart }: { onStart: () => void }) {
  return (
    <Card label="Set your first budget" className="bg-hero text-white">
      <Eyebrow onDark>Your budget</Eyebrow>
      <h2 className="mt-2 text-title">Set your first budget</h2>
      <p className="mt-2 text-body text-white/70">Pick a limit for all spending or one category. We'll suggest one from your forecast.</p>
      <Button full className="mt-5" onClick={onStart}>
        Set your first budget
      </Button>
    </Card>
  );
}

function CompactBudget({ view, onEdit }: { view: BudgetView; onEdit: () => void }) {
  const v = view;
  return (
    <button type="button" onClick={onEdit} className="flex min-w-0 flex-col rounded-card bg-surface p-4 text-left shadow-card" aria-label={`${categoryLabel(v.budget.category)} budget. Edit`}>
      <span className="flex items-center gap-1.5 truncate text-caption text-slate">
        <Wallet size={14} strokeWidth={ICON.stroke} aria-hidden />
        {categoryLabel(v.budget.category)} · {periodNoun(v.period)}
      </span>
      <span className="tabular mt-2 text-heading text-ink">
        {money(v.spent, v.currency)} <span className="text-label font-normal text-slate">of {money(v.limit, v.currency)}</span>
      </span>
      <span className={`tabular mt-1 text-label ${v.left < 0 ? "text-headsup-ink" : "text-ok-ink"}`}>
        {v.left < 0 ? `${money(-v.left, v.currency)} over` : `${money(v.left, v.currency)} left`}
      </span>
      <span className="mt-3">
        <ProgressBar fraction={v.fraction} over={v.status === "headsup"} label={`${categoryLabel(v.budget.category)} budget used`} />
      </span>
    </button>
  );
}

function CompactGoal({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const { state } = useStore();
  const p = goalProgress(state, goal);
  const kept = Math.min(goal.amount, Math.max(0, p.fraction * goal.amount));
  return (
    <button type="button" onClick={onEdit} className="flex min-w-0 flex-col rounded-card bg-surface p-4 text-left shadow-card" aria-label={`Goal: ${goal.name}. Edit`}>
      <span className="flex items-center gap-1.5 truncate text-caption text-slate">
        <Target size={14} strokeWidth={ICON.stroke} aria-hidden />
        Goal · {periodNoun(goal.period)}
      </span>
      <span className="tabular mt-2 text-heading text-ink">
        {money(kept, goal.currency)} <span className="text-label font-normal text-slate">of {money(goal.amount, goal.currency)}</span>
      </span>
      <span className="mt-3">
        <ProgressBar fraction={p.fraction} label={`${goal.name} progress`} />
      </span>
      <span className={`mt-2 flex items-start gap-1.5 text-caption ${p.met ? "text-ok-ink" : "text-slate"}`}>
        {p.met && <PartyPopper size={14} strokeWidth={ICON.stroke} className="shrink-0" aria-hidden />}
        {p.met ? goalMetLine(goal.amount, goal.currency, goal.period, state.tone) : goalMissedLine(state.tone)}
      </span>
    </button>
  );
}

// Forecast detail -----------------------------------------------------------------
function ForecastDetail({ currency }: { currency: CurrencyCode }) {
  const { state } = useStore();
  const usual = USUAL_DAILY_SPEND[currency] ?? 0;
  const [daily, setDaily] = useState<number | null>(null);
  const [moneyOpen, setMoneyOpen] = useState(false);
  const [paydayOpen, setPaydayOpen] = useState(false);
  const f = forecastForCurrency(state, currency, daily === null ? undefined : { usualDailySpend: daily });
  if (!f) return null;
  const headline = f.short
    ? `About ${approxMoney(f.shortfall, currency, "shortfall")} short before ${formatDate(f.payday.nextDate)}`
    : `${approxMoney(f.safeToSpend, currency, "safe")} safe to spend until ${formatDate(f.payday.nextDate)}`;
  const max = Math.max(40, usual * 3);

  return (
    <Card label={`${currency} forecast`}>
      <CardHeader title={`${currency} until ${formatDate(f.payday.nextDate)}`} caption={`${f.payday.name} · ${f.assumptions.daysToPayday} days away`} />
      <StatusChip status={f.short ? "headsup" : "ok"}>{f.short ? "Heads up" : "On track"}</StatusChip>
      <p className="mt-3 text-heading text-ink" data-testid={`forecast-headline-${currency}`}>
        {headline}
      </p>
      <ForecastLine f={f} />
      <List>
        <ListRow
          onClick={() => setMoneyOpen(true)}
          leading={<RowIcon icon={Wallet} />}
          title="Money you have now"
          caption="Until your next payday"
          trailing={<Money amount={f.assumptions.moneyUntilPayday} currency={currency} />}
          chevron
        />
        <ListRow
          onClick={() => setPaydayOpen(true)}
          leading={<RowIcon icon={CalendarDays} />}
          title="Next payday"
          caption={f.payday.name}
          trailing={formatDate(f.payday.nextDate)}
          chevron
        />
        {f.assumptions.knownPaymentsDue.map((p) => (
          <ListRow key={p.label + p.date} title={p.label} caption={`Due ${formatDate(p.date)}, before payday`} trailing={<Money amount={p.amount} currency={currency} prefix="−" />} />
        ))}
      </List>
      <div className="mt-4">
        <Slider
          label="What if you spent this a day?"
          min={0}
          max={max}
          value={f.assumptions.usualDailySpend}
          onChange={setDaily}
          display={`${money(f.assumptions.usualDailySpend, currency)} a day`}
          caption={`What-if only. Your usual is ${money(usual, currency)} a day, from your own payments.`}
        />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-4">
        <WhyButton why={forecastWhy(f, headline)} />
        {daily !== null && (
          <Button variant="text" onClick={() => setDaily(null)}>
            Back to my usual
          </Button>
        )}
      </div>
      <MoneySheet open={moneyOpen} onClose={() => setMoneyOpen(false)} currency={currency} />
      <PaydaySheet open={paydayOpen} onClose={() => setPaydayOpen(false)} payday={f.payday} />
    </Card>
  );
}

/** A simple line from today to payday. Dashed line = zero. */
function ForecastLine({ f }: { f: Forecast }) {
  const n = Math.max(1, f.assumptions.daysToPayday);
  const pts: number[] = [f.assumptions.moneyUntilPayday];
  for (let d = 1; d <= n; d++) pts.push(pts[d - 1] - f.assumptions.usualDailySpend);
  pts[pts.length - 1] -= f.knownPaymentsTotal;
  const min = Math.min(...pts, 0);
  const max = Math.max(...pts, 1);
  const w = 300;
  const h = 64;
  const x = (i: number) => (i / (pts.length - 1)) * w;
  const y = (v: number) => 4 + (h - 8) - ((v - min) / (max - min || 1)) * (h - 8);
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" role="img" aria-label={`Forecast line from today to payday, ending at ${money(pts[pts.length - 1], f.currency)}`}>
        <line x1="0" y1={y(0)} x2={w} y2={y(0)} stroke={color.line} strokeWidth="1.5" strokeDasharray="4 4" />
        <path d={d} fill="none" stroke={f.short ? color.headsUp : color.ok} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-caption text-slate">
        <span>Today</span>
        <span>Payday, {formatDate(f.payday.nextDate)}</span>
      </figcaption>
    </figure>
  );
}

// Tips ------------------------------------------------------------------------
function Tips() {
  const { state } = useStore();
  const merchants = [...state.transactions.map((t) => t.merchant), ...state.upcoming.map((u) => u.merchant)];
  const tips = tipOpportunities(state)
    .map((tip) => ({ tip, text: tipText(tip) }))
    // Guardrail: never show a tip that fails the checks (R11, section 7).
    .filter(({ text }) => checkTip(text, merchants).ok);
  if (tips.length === 0) return null;
  return (
    <Card label="Ideas to try">
      <CardHeader title="Ideas to try" caption="Options, not instructions. Guidance, not financial advice." />
      <List>
        {tips.map(({ tip, text }) => (
          <div key={tip.id} className="flex gap-3 py-3">
            <RowIcon icon={Lightbulb} />
            <div className="min-w-0 flex-1">
              <p className="text-body text-ink">{text}</p>
              <WhyButton why={tipWhy(tip, text)} />
            </div>
          </div>
        ))}
      </List>
    </Card>
  );
}

// Partner rewards (R4, R7) -----------------------------------------------------------
function Rewards() {
  const { state } = useStore();
  if (anyForecastShort(state)) return null; // R4: hide all rewards while short, in every tone.
  if (!state.consent.personalisedRewards) return null; // R7: opt-in only.
  const eligible = state.goals.filter((g) => goalUnlocksReward(g) && goalProgress(state, g).met);
  if (eligible.length === 0) return null;
  return (
    <Card label="Partner rewards">
      <CardHeader title="Partner rewards" caption="Kept apart from tips. Partners never see you or your payments." />
      <div className="flex flex-col gap-3">
        {eligible.map((g) => {
          const text = rewardText(5, g.currency);
          return (
            <div key={g.id} className="rounded-input bg-gold-tint p-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-visa-gold px-3 py-1 text-caption text-ink">
                <Gift size={14} strokeWidth={ICON.stroke} aria-hidden />
                Partner reward
              </span>
              <p className="mt-2 text-body text-ink">{text}</p>
              <WhyButton why={rewardWhy(g, text)} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
