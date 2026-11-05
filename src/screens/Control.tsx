// Control.tsx — consent and control centre. Budgets and goals near the top, banks and
// cards, sharing, paydays, base currency, tone and your data. Demo reset: long-press the logo.

import { useState } from "react";
import { Coins, Download, History, Landmark, Plus, Target, Trash2, Wallet } from "lucide-react";
import { CURRENCY_SYMBOL, DEMO_TODAY_LABEL, DISCLAIMER, type CurrencyCode } from "../domain/config";
import { formatDate } from "../domain/dates";
import { goalProgress } from "../domain/forecastRules";
import { budgetView } from "../domain/planRules";
import { formatAmount, money, periodNoun } from "../domain/textWriter";
import type { Budget, Card as CardT, Consent, Goal, Payday } from "../domain/types";
import { COUNTRY_NAME } from "../domain/types";
import { bankByName } from "../data/banks";
import { addCard, toggleNotMyPattern, useStore } from "../state/store";
import { AppHeader } from "../ui/AppHeader";
import { Card, CardHeader, Stack } from "../ui/Card";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Chip";
import { TextField } from "../ui/Field";
import { List, ListRow, RowIcon } from "../ui/ListRow";
import { Sheet } from "../ui/Sheet";
import { Toggle } from "../ui/Toggle";
import { BankTile, CardTile, Flag } from "../ui/Brand";
import { EmptyState } from "../ui/ProgressBar";
import { useToast } from "../ui/Toast";
import { BaseCurrencySheet } from "../ui/BaseCurrencySheet";
import { ICON } from "../ui/icons";
import { TonePicker } from "./Onboarding";
import { PaydaySheet, frequencyLabel } from "../sheets/PaydaySheet";
import { MoneySheet } from "../sheets/MoneySheet";
import { BudgetSheet, GoalSheet, categoryLabel } from "../sheets/PlanSheets";
import { CardDetailSheet } from "../sheets/CardSheets";
import { AddBankSheet, RemoveBankSheet } from "../sheets/BankSheets";

export function Control() {
  const { state, reset, setFirstName } = useStore();
  const toast = useToast();
  const [baseOpen, setBaseOpen] = useState(false);
  return (
    <div>
      <AppHeader
        title="Control"
        caption="Your data. Your choice."
        onLogoLongPress={() => {
          reset();
          toast({ message: "Demo reset" });
        }}
      />
      <Stack>
        <Card label="Our promise">
          <p className="text-body font-medium text-ink">No paid rankings.</p>
          <p className="mt-1 text-label font-normal text-slate">Partners never pay to change your insights or tips.</p>
        </Card>

        <BudgetsAndGoals />
        <BanksAndCards />
        <Sharing />
        <Paydays />

        <Card label="Base currency">
          <CardHeader title="Base currency" caption="For the ≈ total only. Forecasts, budgets and goals stay in their own currency." />
          <List>
            <ListRow
              onClick={() => setBaseOpen(true)}
              leading={<RowIcon icon={Coins} />}
              title={`${CURRENCY_SYMBOL[state.baseCurrency]} ${state.baseCurrency}`}
              caption="Demo rate, fixed on Wed 4 Nov"
              chevron
              ariaLabel={`Base currency ${state.baseCurrency}. Change`}
            />
          </List>
          <BaseCurrencySheet open={baseOpen} onClose={() => setBaseOpen(false)} />
        </Card>

        <Card label="AI tone">
          <CardHeader title="How Visa One talks" caption="Tone changes the words, never the numbers." />
          <TonePicker />
        </Card>

        <Card label="Your name">
          <TextField
            label="First name (optional)"
            placeholder="We'll just say Hi"
            value={state.firstName ?? ""}
            onChange={(e) => setFirstName(e.target.value || null)}
          />
        </Card>

        <NotMyPatternList />
        <YourData />

        <div className="px-1 pb-4 pt-2 text-center">
          <p className="text-caption text-slate">Demo date: {DEMO_TODAY_LABEL}</p>
          <p className="mt-1 text-caption text-slate">{DISCLAIMER}</p>
        </div>
      </Stack>
    </div>
  );
}

// Budgets and goals: edit at any time (change request 2, section 3) ----------------
function BudgetsAndGoals() {
  const { state } = useStore();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [newBudget, setNewBudget] = useState(false);
  const [newGoal, setNewGoal] = useState(false);
  return (
    <Card label="Budgets and goals">
      <CardHeader title="Budgets and goals" caption="Tap one to change it. Plan and Home update at once." />
      <List>
        {state.budgets.map((b) => {
          const v = budgetView(state, b);
          return (
            <ListRow
              key={b.id}
              onClick={() => setBudget(b)}
              ariaLabel={`${categoryLabel(b.category)} budget, ${money(b.limit, b.currency)} a ${periodNoun(b.period)}. Edit`}
              leading={<RowIcon icon={Wallet} />}
              title={`${categoryLabel(b.category)} budget`}
              caption={`${v.left < 0 ? `${money(-v.left, b.currency)} over` : `${money(v.left, b.currency)} left`} this ${periodNoun(b.period)}`}
              trailing={money(b.limit, b.currency)}
              trailingCaption={`a ${periodNoun(b.period)}`}
            />
          );
        })}
        {state.goals.map((g) => {
          const p = goalProgress(state, g);
          return (
            <ListRow
              key={g.id}
              onClick={() => setGoal(g)}
              ariaLabel={`Goal ${g.name}. Edit`}
              leading={<RowIcon icon={Target} tone="gold" />}
              title={g.name}
              caption={p.met ? "Goal met" : "In progress"}
              trailing={money(g.amount, g.currency)}
              trailingCaption={`a ${periodNoun(g.period)}`}
            />
          );
        })}
        <ListRow onClick={() => setNewBudget(true)} leading={<RowIcon icon={Plus} />} title="Add budget" />
        <ListRow onClick={() => setNewGoal(true)} leading={<RowIcon icon={Plus} />} title="Add goal" />
      </List>
      <BudgetSheet open={budget !== null} budget={budget ?? undefined} onClose={() => setBudget(null)} />
      <BudgetSheet open={newBudget} prefill={{ category: "All", period: "weekly", currency: "GBP" }} onClose={() => setNewBudget(false)} />
      <GoalSheet open={goal !== null} goal={goal ?? undefined} onClose={() => setGoal(null)} />
      <GoalSheet open={newGoal} onClose={() => setNewGoal(false)} />
    </Card>
  );
}

// Banks and cards (change request 2, section 5) ------------------------------------
function BanksAndCards() {
  const { state, setState } = useStore();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [detail, setDetail] = useState<CardT | null>(null);
  const banks = [...new Set(state.cards.filter((c) => c.connected).map((c) => c.bank))];

  return (
    <Card label="Banks and cards">
      <CardHeader title="Banks and cards" caption="Only Visa cards. Removing a bank keeps its history so you can add it back." />
      {banks.length === 0 && <EmptyState text="No banks connected." />}
      <div className="flex flex-col gap-4">
        {banks.map((name) => {
          const bank = bankByName(name);
          const cards = state.cards.filter((c) => c.bank === name);
          return (
            <section key={name} aria-label={name} data-testid={`bank-${name}`} className="rounded-input bg-canvas px-4 pb-2 pt-3">
              <div className="flex items-center gap-3">
                {bank && <BankTile bank={bank} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold text-ink">{name}</p>
                  {bank && (
                    <p className="flex items-center gap-1.5 text-caption text-slate">
                      <Flag country={bank.country} /> {COUNTRY_NAME[bank.country]}
                    </p>
                  )}
                </div>
                <Button variant="text" onClick={() => setRemoving(name)}>
                  Remove bank
                </Button>
              </div>
              <List>
                {cards.map((c) => (
                  <ListRow
                    key={c.id}
                    onClick={c.connected ? () => setDetail(c) : undefined}
                    ariaLabel={c.connected ? `${c.nickname}, ending ${c.last4}. Manage card` : undefined}
                    leading={<CardTile card={c} size="sm" />}
                    title={c.nickname}
                    caption={`Visa ${c.type} · •• ${c.last4} · ${c.currency}`}
                    chevron={c.connected}
                    trailing={
                      c.connected ? undefined : (
                        <Button variant="text" onClick={() => setState((s) => addCard(s, c))}>
                          Add back
                        </Button>
                      )
                    }
                  />
                ))}
              </List>
            </section>
          );
        })}
      </div>
      <Button full variant="secondary" className="mt-4" icon={<Landmark size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden />} onClick={() => setAdding(true)}>
        Add a bank
      </Button>
      <AddBankSheet open={adding} onClose={() => setAdding(false)} />
      <RemoveBankSheet bankName={removing} open={removing !== null} onClose={() => setRemoving(null)} />
      <CardDetailSheet card={detail} period="week" open={detail !== null} onClose={() => setDetail(null)} />
    </Card>
  );
}

const SHARING: { key: keyof Consent; title: string; needed: boolean; why: string }[] = [
  { key: "cardPayments", title: "Card payments", needed: true, why: "Needed to show what you've spent and to forecast your payday. Only Visa card payments, never your bank balance or other accounts." },
  { key: "categories", title: "Spending categories", needed: true, why: "Needed to group payments into habits, like takeaways or transport." },
  { key: "personalisedRewards", title: "Personalised rewards", needed: false, why: "Lets a met weekly, monthly or yearly goal unlock a partner reward. Partners never see you or your payments. Rewards are hidden while any forecast is short." },
];

function Sharing() {
  const { state, setState } = useStore();
  const [why, setWhy] = useState<(typeof SHARING)[number] | null>(null);
  return (
    <Card label="What is shared">
      <CardHeader title="What Visa One can see" />
      <List>
        {SHARING.map((r) => (
          <div key={r.key} className="flex min-h-row items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-body font-medium text-ink">
                {r.title} {r.needed && <Tag>Needed</Tag>}
              </p>
              <Button variant="text" onClick={() => setWhy(r)}>
                Why we need this
              </Button>
            </div>
            <Toggle
              label={r.title}
              on={state.consent[r.key]}
              disabled={r.needed}
              onChange={(v) => setState((s) => ({ ...s, consent: { ...s.consent, [r.key]: v } }))}
            />
          </div>
        ))}
      </List>
      <Sheet open={why !== null} onClose={() => setWhy(null)} title={`Why we need ${why?.title.toLowerCase() ?? ""}`}>
        <p className="text-body text-ink">{why?.why}</p>
      </Sheet>
    </Card>
  );
}

function Paydays() {
  const { state } = useStore();
  const [editing, setEditing] = useState<Payday | null>(null);
  const [adding, setAdding] = useState(false);
  const [moneyFor, setMoneyFor] = useState<CurrencyCode | null>(null);
  const currencies = Object.keys(state.moneyUntilPayday) as CurrencyCode[];
  return (
    <Card label="Paydays">
      <CardHeader title="Paydays" caption="Visa can't see your income, so you tell us." />
      <List>
        {state.paydays.map((p) => (
          <ListRow
            key={p.id}
            onClick={() => setEditing(p)}
            leading={<RowIcon icon={Wallet} />}
            title={p.name}
            caption={`${CURRENCY_SYMBOL[p.currency]}${formatAmount(p.amount)} · ${frequencyLabel(p.frequency)} · next ${formatDate(p.nextDate)}`}
            chevron
          />
        ))}
        <ListRow onClick={() => setAdding(true)} leading={<RowIcon icon={Plus} />} title="Add a payday" />
      </List>
      <p className="mt-4 text-caption uppercase tracking-caps text-slate">Money until your next payday</p>
      <List>
        {currencies.map((c) => (
          <ListRow
            key={c}
            onClick={() => setMoneyFor(c)}
            ariaLabel={`Money until payday in ${c}, ${money(state.moneyUntilPayday[c] ?? 0, c)}. Edit`}
            leading={<RowIcon icon={Coins} tone="neutral" />}
            title={c}
            trailing={money(state.moneyUntilPayday[c] ?? 0, c)}
            chevron
          />
        ))}
      </List>
      <PaydaySheet open={adding} onClose={() => setAdding(false)} />
      <PaydaySheet open={editing !== null} payday={editing ?? undefined} onClose={() => setEditing(null)} />
      <MoneySheet open={moneyFor !== null} currency={moneyFor ?? "GBP"} onClose={() => setMoneyFor(null)} />
    </Card>
  );
}

function NotMyPatternList() {
  const { state, setState } = useStore();
  const marked = state.transactions.filter((t) => t.notMyPattern);
  return (
    <Card label="Not my pattern">
      <CardHeader title="Not my pattern" caption="These still count in totals and forecasts, not in habits or rewards." />
      {marked.length === 0 ? (
        <EmptyState text="Nothing marked yet." />
      ) : (
        <List>
          {marked.map((t) => (
            <ListRow
              key={t.id}
              title={t.merchant}
              caption={`${money(t.amount, t.currency)} · ${t.category} · ${formatDate(t.date)}`}
              trailing={
                <Button variant="text" onClick={() => setState((s) => toggleNotMyPattern(s, t.id))}>
                  Undo
                </Button>
              }
            />
          ))}
        </List>
      )}
    </Card>
  );
}

function YourData() {
  const { state, exportData, deleteData } = useStore();
  const [sheet, setSheet] = useState<"log" | "download" | "delete" | null>(null);
  return (
    <Card label="Your data">
      <CardHeader title="Your data" />
      <List>
        <ListRow
          onClick={() => setSheet("log")}
          leading={<RowIcon icon={History} />}
          title="Why did I see this?"
          caption={`${state.whyLog.length} explanation${state.whyLog.length === 1 ? "" : "s"} opened`}
          chevron
        />
        <ListRow onClick={() => setSheet("download")} leading={<RowIcon icon={Download} />} title="Download my data" chevron />
        <ListRow onClick={() => setSheet("delete")} leading={<RowIcon icon={Trash2} tone="neutral" />} title="Delete my data" chevron />
      </List>

      <Sheet open={sheet === "log"} onClose={() => setSheet(null)} title="Why did I see this?" caption="Every insight, summary line, tip and reward you opened a why for.">
        {state.whyLog.length === 0 ? (
          <EmptyState text="Open any See why and it appears here." />
        ) : (
          <ul className="divide-y divide-line">
            {state.whyLog.map((w) => (
              <li key={w.id} className="py-3">
                <Tag>{w.kind}</Tag>
                <p className="mt-2 text-body font-medium text-ink">{w.text}</p>
                <p className="mt-1 text-label font-normal text-slate">{w.detail}</p>
                <p className="mt-1 text-caption text-slate">Rule: {w.rule}</p>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <Sheet
        open={sheet === "download"}
        onClose={() => setSheet(null)}
        title="Download my data"
        footer={
          <Button full icon={<Download size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden />} onClick={exportData}>
            Download as a file
          </Button>
        }
      >
        <p className="text-body text-ink">
          A JSON file with everything Visa One keeps on this device: your banks, cards, payments, paydays, budgets, goals and choices.
        </p>
      </Sheet>

      <Sheet
        open={sheet === "delete"}
        onClose={() => setSheet(null)}
        title="Delete all your data?"
        footer={
          <>
            <Button full variant="secondary" onClick={() => setSheet(null)}>
              Keep my data
            </Button>
            <Button
              variant="danger-text"
              onClick={() => {
                setSheet(null);
                deleteData();
              }}
            >
              Yes, delete everything
            </Button>
          </>
        }
      >
        <p className="text-body text-ink">This clears everything Visa One stores on this device and starts again. Your bank cards are not affected.</p>
      </Sheet>
    </Card>
  );
}
