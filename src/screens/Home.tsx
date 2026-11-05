// Home.tsx — dashboard (steering section 3, Home).

import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Plus, Repeat, Sparkles } from "lucide-react";
import { CURRENCY_SYMBOL, type CurrencyCode } from "../domain/config";
import { FX_LABEL } from "../domain/fxRates";
import { COUNTRY_SHORT, type Card as CardT } from "../domain/types";
import { daysFromToday, formatDate } from "../domain/dates";
import {
  allForecasts,
  baseTotal,
  biggestHabitChange,
  cardBreakdowns,
  currenciesNeedingPayday,
  currenciesWithSpend,
  nextUpcoming,
  totalForCurrency,
  type Period,
} from "../domain/forecastRules";
import {
  approxWhole,
  budgetStatusLine,
  forecastRingCaption,
  forecastSummaryLine,
  habitSummaryLine,
  money,
  periodAdjective,
  upcomingSummaryLine,
} from "../domain/textWriter";
import { budgetView, mainBudget } from "../domain/planRules";
import { useStore } from "../state/store";
import { ToneSwitch } from "../ui/ToneSwitch";
import { categoryLabel } from "../sheets/PlanSheets";
import { AppHeader } from "../ui/AppHeader";
import { Card, CardHeader, Eyebrow, Stack } from "../ui/Card";
import { Chip, ChipGroup, Tag } from "../ui/Chip";
import { List, ListRow, RowIcon } from "../ui/ListRow";
import { Money } from "../ui/Money";
import { Ring, ringFraction } from "../ui/Ring";
import { Button } from "../ui/Button";
import { CardTile, Flag } from "../ui/Brand";
import { WhyButton, type WhyContent } from "../ui/WhySheet";
import { forecastWhy, habitWhy, upcomingWhy } from "../ui/whyContent";
import { useMotion } from "../ui/motion";
import { ICON } from "../ui/icons";
import { BaseCurrencySheet } from "../ui/BaseCurrencySheet";
import { EmptyState, ProgressBar } from "../ui/ProgressBar";
import { AddCardSheet, CardDetailSheet } from "../sheets/CardSheets";
import { PaydaySheet } from "../sheets/PaydaySheet";

type Filter = "all" | CurrencyCode | `country:${CardT["country"]}`;

export function Home() {
  const { state } = useStore();
  const [period, setPeriod] = useState<Period>("week");
  const [filter, setFilter] = useState<Filter>("all");
  return (
    <div>
      <AppHeader title={state.firstName ? `Hi ${state.firstName}` : "Hi"} />
      <Stack>
        <HeroForecast />
        <SummaryCard />
        <HomeBudget />
        <Totals period={period} setPeriod={setPeriod} filter={filter} setFilter={setFilter} />
        <YourCards period={period} filter={filter} />
        <ComingUp />
      </Stack>
    </div>
  );
}

// Hero: forecast ring per currency ---------------------------------------
function HeroForecast() {
  const { state } = useStore();
  const m = useMotion();
  const forecasts = allForecasts(state);
  const needing = currenciesNeedingPayday(state, "week");
  const [chosen, setChosen] = useState<CurrencyCode | undefined>(
    () => (forecasts.find((f) => f.short) ?? forecasts[0])?.currency
  );
  const [addFor, setAddFor] = useState<CurrencyCode | null>(null);
  const f = forecasts.find((x) => x.currency === chosen) ?? forecasts[0];

  return (
    <motion.section aria-label="Payday forecast" className="rounded-card bg-hero p-5 text-white shadow-card" {...m.hero}>
      <div className="flex items-center justify-between gap-3">
        <Eyebrow onDark>Payday forecast</Eyebrow>
        {forecasts.length > 1 && (
          <ChipGroup label="Forecast currency">
            {forecasts.map((x) => (
              <Chip key={x.currency} onDark selected={x.currency === f?.currency} onClick={() => setChosen(x.currency)}>
                {CURRENCY_SYMBOL[x.currency]} {x.currency}
              </Chip>
            ))}
          </ChipGroup>
        )}
      </div>
      {f ? (
        <>
          <div className="mt-4 flex justify-center">
            <Ring
              key={f.currency}
              status={f.short ? "short" : "ok"}
              amount={approxWhole(f.short ? f.shortfall : f.safeToSpend, f.short ? "shortfall" : "safe")}
              currency={f.currency}
              fraction={ringFraction(f)}
              caption={`${f.assumptions.daysToPayday} day${f.assumptions.daysToPayday === 1 ? "" : "s"} to payday`}
            />
          </div>
          <p className="mt-4 text-center text-heading">{forecastRingCaption(f)}</p>
          <div className="mt-1 flex justify-center">
            <WhyButton onDark why={forecastWhy(f, forecastRingCaption(f))} />
          </div>
        </>
      ) : (
        <p className="mt-4 text-body">Add a payday to get a forecast.</p>
      )}
      {needing.map((c) => (
        <div key={c} className="mt-3 flex items-center justify-between gap-3 rounded-input bg-white/10 py-1 pl-4 pr-2">
          <span className="text-label">Add a payday in {c} to get a forecast</span>
          <Button variant="text-on-dark" onClick={() => setAddFor(c)}>
            Add
          </Button>
        </div>
      ))}
      <PaydaySheet open={addFor !== null} defaultCurrency={addFor ?? "GBP"} onClose={() => setAddFor(null)} />
    </motion.section>
  );
}

// Summary: at most three lines, each with a "why" ------------------------
function SummaryCard() {
  const { state } = useStore();
  const forecasts = allForecasts(state);
  const first = forecasts.find((f) => f.short) ?? forecasts[0];
  const habit = biggestHabitChange(state, "GBP");
  const upcoming = nextUpcoming(state);

  const lines: { text: string; why: WhyContent; shortfall?: boolean }[] = [];
  if (first) {
    const text = forecastSummaryLine(first, state.tone);
    lines.push({ text, why: forecastWhy(first, text, "summary"), shortfall: first.short });
  }
  if (habit) {
    const text = habitSummaryLine(habit, state.tone);
    lines.push({ text, why: habitWhy(habit, text, "summary") });
  }
  if (upcoming) {
    const card = state.cards.find((c) => c.id === upcoming.cardId);
    const text = upcomingSummaryLine(upcoming, state.tone);
    lines.push({ text, why: upcomingWhy(upcoming, card ? `${card.nickname} •• ${card.last4}` : "Visa", text) });
  }

  return (
    <Card label="Summary">
      <p className="mb-2 flex items-center gap-2 text-label font-semibold text-visa-blue">
        <Sparkles size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden />
        Summary
      </p>
      <ul data-testid="summary-lines" className="divide-y divide-line">
        {lines.slice(0, 3).map((l) => (
          <li key={l.text} className="py-2">
            <p className="text-body text-ink">{l.text}</p>
            <div className="flex flex-wrap items-center gap-x-4">
              <WhyButton why={l.why} />
              {l.shortfall && <ToneSwitch />}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Main budget (edits in Plan or Control show here at once) ---------------
function HomeBudget() {
  const { state } = useStore();
  const navigate = useNavigate();
  const main = mainBudget(state);
  if (!main) return null;
  const v = budgetView(state, main);
  const over = v.left < 0;
  return (
    <Card label="Your budget">
      <button type="button" onClick={() => navigate("/plan")} className="block w-full text-left" data-testid="home-budget" aria-label="Your budget. Open Plan">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-label text-slate">
            Your {periodAdjective(v.period)} budget · {categoryLabel(main.category)}
          </p>
          <ChevronRight size={ICON.sm} strokeWidth={ICON.stroke} className="shrink-0 text-slate" aria-hidden />
        </div>
        <p className="mt-1 flex items-baseline justify-between gap-3">
          <span className="text-title text-visa-navy">
            <Money amount={v.limit} currency={v.currency} />
          </span>
          <span className={`tabular text-body font-semibold ${over ? "text-headsup-ink" : "text-ok-ink"}`}>
            {over ? `${money(-v.left, v.currency)} over` : `${money(v.left, v.currency)} left`}
          </span>
        </p>
        <div className="mt-3">
          <ProgressBar fraction={v.fraction} over={v.status === "headsup"} label="Budget used" />
        </div>
        <p className="mt-2 text-label font-normal text-ink">{budgetStatusLine(v, state.tone)}</p>
      </button>
    </Card>
  );
}

// Totals: one line per currency, then the ≈ base total --------------------
function Totals({
  period,
  setPeriod,
  filter,
  setFilter,
}: {
  period: Period;
  setPeriod: (p: Period) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
}) {
  const { state } = useStore();
  const [baseOpen, setBaseOpen] = useState(false);
  const currencies = currenciesWithSpend(state, period);
  const countries = [...new Set(state.cards.filter((c) => c.connected).map((c) => c.country))];

  let shown = currencies;
  let singleCurrency = false;
  if (filter.startsWith("country:")) {
    const country = filter.split(":")[1];
    const inCountry = new Set(state.cards.filter((c) => c.country === country).map((c) => c.currency));
    shown = currencies.filter((c) => inCountry.has(c));
  } else if (filter !== "all") {
    shown = currencies.filter((c) => c === filter);
    singleCurrency = true;
  }
  const bt = baseTotal(state, period);
  const hideBase = singleCurrency || shown.length <= 1;

  return (
    <Card label="Total spent">
      <CardHeader
        title="Spent"
        caption={`This ${period}, per currency.`}
        action={
          <ChipGroup label="Period">
            {(["week", "month"] as Period[]).map((p) => (
              <Chip key={p} selected={period === p} onClick={() => setPeriod(p)}>
                {p === "week" ? "Week" : "Month"}
              </Chip>
            ))}
          </ChipGroup>
        }
      />
      <p data-testid="currency-totals" className="flex flex-wrap items-baseline gap-x-3 text-title text-visa-navy">
        {shown.length === 0 && <span className="text-body text-slate">No spending yet.</span>}
        {shown.map((c, i) => (
          <Fragment key={c}>
            {i > 0 && (
              <span className="text-title font-normal text-slate" aria-hidden>
                ·
              </span>
            )}
            <Money amount={totalForCurrency(state, c, period)} currency={c} />
          </Fragment>
        ))}
      </p>
      {!hideBase && (
        <button
          type="button"
          data-testid="base-total"
          onClick={() => setBaseOpen(true)}
          className="tabular mt-1 min-h-11 text-left text-label font-normal text-slate underline decoration-line underline-offset-4"
        >
          ≈ {money(bt.amount, bt.base)} in total (base currency {bt.base}, {bt.rateNote})
        </button>
      )}
      <div className="mt-4">
        <ChipGroup label="Filter totals">
          <Chip selected={filter === "all"} onClick={() => setFilter("all")}>
            All
          </Chip>
          {currencies.map((c) => (
            <Chip key={c} selected={filter === c} onClick={() => setFilter(c)}>
              {CURRENCY_SYMBOL[c]} {c}
            </Chip>
          ))}
          {countries.map((country) => (
            <Chip
              key={country}
              selected={filter === `country:${country}`}
              onClick={() => setFilter(`country:${country}`)}
              icon={<Flag country={country} />}
            >
              {COUNTRY_SHORT[country]}
            </Chip>
          ))}
        </ChipGroup>
      </div>
      <p className="mt-3 text-caption text-slate">{FX_LABEL}. Real rates would come from Visa daily.</p>
      <BaseCurrencySheet open={baseOpen} onClose={() => setBaseOpen(false)} />
    </Card>
  );
}

// Your cards ----------------------------------------------------------------
function YourCards({ period, filter }: { period: Period; filter: Filter }) {
  const { state } = useStore();
  const [detail, setDetail] = useState<CardT | null>(null);
  const [adding, setAdding] = useState(false);
  let rows = cardBreakdowns(state, period);
  if (filter.startsWith("country:")) rows = rows.filter((r) => r.card.country === filter.split(":")[1]);
  else if (filter !== "all") rows = rows.filter((r) => r.card.currency === filter);

  return (
    <Card label="Your cards">
      <CardHeader title="Your cards" caption={`This ${period}, in each card's own currency.`} />
      <List>
        {rows.map((r) => (
          <ListRow
            key={r.card.id}
            ariaLabel={`${r.card.nickname}, ${r.card.bank}, ending ${r.card.last4}. Open card details`}
            onClick={() => setDetail(r.card)}
            leading={<CardTile card={r.card} size="sm" />}
            title={
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{r.card.nickname}</span>
                {!r.card.includedInTotals && <Tag>Not in totals</Tag>}
              </span>
            }
            caption={
              <span className="inline-flex items-center gap-1.5">
                <Flag country={r.card.country} />
                {r.card.nickname !== r.card.bank ? `${r.card.bank} · ` : ""}•• {r.card.last4}
                {r.topCategory ? ` · Top: ${r.topCategory}` : ""}
              </span>
            }
            trailing={<Money amount={r.spent} currency={r.card.currency} />}
            trailingCaption={`${Math.round(r.shareOfCurrency * 100)}% of ${r.card.currency}`}
          />
        ))}
        <ListRow
          onClick={() => setAdding(true)}
          leading={<RowIcon icon={Plus} />}
          title="Add a card"
          caption="Visa cards from any of your banks"
        />
      </List>
      <CardDetailSheet card={detail} period={period} open={detail !== null} onClose={() => setDetail(null)} />
      <AddCardSheet open={adding} onClose={() => setAdding(false)} />
    </Card>
  );
}

// Coming up: next renewals ----------------------------------------------------
function ComingUp() {
  const { state } = useStore();
  const upcoming = state.upcoming
    .filter((u) => daysFromToday(u.renewsOn) >= 0)
    .sort((a, b) => (a.renewsOn < b.renewsOn ? -1 : 1));
  return (
    <Card label="Coming up">
      <CardHeader title="Coming up" caption="Next renewals on your Visa cards." />
      {upcoming.length === 0 ? (
        <EmptyState text="No renewals coming up." />
      ) : (
        <List>
          {upcoming.map((u) => {
            const card = state.cards.find((c) => c.id === u.cardId);
            const d = daysFromToday(u.renewsOn);
            const when = d === 0 ? "Today" : d === 1 ? "Tomorrow" : formatDate(u.renewsOn);
            return (
              <ListRow
                key={u.id}
                leading={<RowIcon icon={Repeat} />}
                title={u.merchant}
                caption={`${when}${card ? ` · ${card.nickname} •• ${card.last4}` : ""}`}
                trailing={<Money amount={u.amount} currency={u.currency} />}
              />
            );
          })}
        </List>
      )}
    </Card>
  );
}
