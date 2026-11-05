// Habits.tsx — spending habits, learned only from the user's own card payments.
// "Not my pattern" keeps a payment in totals and the forecast but out of habits (R6).

import { useState } from "react";
import { CURRENCY_SYMBOL, type CurrencyCode } from "../domain/config";
import { formatDate } from "../domain/dates";
import { connectedTx, habitLines, type HabitLine } from "../domain/forecastRules";
import { money } from "../domain/textWriter";
import type { Transaction } from "../domain/types";
import { useStore } from "../state/store";
import { AppHeader } from "../ui/AppHeader";
import { Card, CardHeader, Stack } from "../ui/Card";
import { Chip, ChipGroup, Tag, Trend } from "../ui/Chip";
import { List, ListRow, RowIcon } from "../ui/ListRow";
import { Money } from "../ui/Money";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/ProgressBar";
import { WhySheet } from "../ui/WhySheet";
import { habitWhy } from "../ui/whyContent";
import { CATEGORY_ICON } from "../ui/icons";
import { PaymentSheet } from "../sheets/PaymentSheet";

type Unit = "day" | "week" | "month";
const PAGE = 20;

export function Habits() {
  const { state } = useStore();
  const currencies = [...new Set(connectedTx(state).map((t) => t.currency))];
  const [currency, setCurrency] = useState<CurrencyCode>(currencies[0] ?? "GBP");
  const [unit, setUnit] = useState<Unit>("week");

  return (
    <div>
      <AppHeader title="Habits" caption="Learned only from your own card payments." />
      <Stack>
        <div className="flex flex-col gap-2">
          <ChipGroup label="Period">
            {(["day", "week", "month"] as Unit[]).map((u) => (
              <Chip key={u} selected={unit === u} onClick={() => setUnit(u)}>
                {u === "day" ? "Day" : u === "week" ? "Week" : "Month"}
              </Chip>
            ))}
          </ChipGroup>
          {currencies.length > 1 && (
            <ChipGroup label="Currency">
              {currencies.map((c) => (
                <Chip key={c} selected={currency === c} onClick={() => setCurrency(c)}>
                  {CURRENCY_SYMBOL[c]} {c}
                </Chip>
              ))}
            </ChipGroup>
          )}
        </div>
        <Categories currency={currency} unit={unit} />
        <RecentPayments currency={currency} />
      </Stack>
    </div>
  );
}

function Categories({ currency, unit }: { currency: CurrencyCode; unit: Unit }) {
  const { state, logWhy } = useStore();
  const [open, setOpen] = useState<HabitLine | null>(null);
  const lines = habitLines(state, currency);
  const value = (h: HabitLine) => (unit === "day" ? h.perDay : unit === "week" ? h.perWeek : h.perMonth);
  const label = (h: HabitLine) => `${h.category}: about ${money(value(h), h.currency)} a ${unit}, ${h.trend} on your usual.`;
  const why = open ? habitWhy(open, label(open)) : null;

  return (
    <Card label="Habits by category">
      <CardHeader title="By category" caption={`Average per ${unit}, compared with your own usual.`} />
      {lines.length === 0 ? (
        <EmptyState text={`No habits yet in ${currency}.`} />
      ) : (
        <List>
          {lines.map((h) => {
            const Icon = CATEGORY_ICON[h.category];
            return (
              <ListRow
                key={h.category}
                ariaLabel={`${label(h)} Open why`}
                onClick={() => {
                  setOpen(h);
                  const w = habitWhy(h, label(h));
                  logWhy({ kind: w.kind, text: w.forText, rule: w.rule, detail: w.detailText });
                }}
                leading={<RowIcon icon={Icon} />}
                title={h.category}
                caption={`${h.count} payment${h.count === 1 ? "" : "s"} in 4 weeks`}
                trailing={<Money amount={value(h)} currency={h.currency} />}
                trailingCaption={<Trend trend={h.trend} />}
              />
            );
          })}
        </List>
      )}
      {why && <WhySheet open={open !== null} onClose={() => setOpen(null)} why={why} />}
    </Card>
  );
}

function RecentPayments({ currency }: { currency: CurrencyCode }) {
  const { state } = useStore();
  const [open, setOpen] = useState<Transaction | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const connected = new Set(state.cards.filter((c) => c.connected).map((c) => c.id));
  const all = state.transactions
    .filter((t) => t.currency === currency && connected.has(t.cardId))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const tx = all.slice(0, limit);

  return (
    <Card label="Recent payments">
      <CardHeader title="Recent payments" caption="Tap a payment that isn't really you, like a gift." />
      <List>
        {tx.map((t) => {
          const Icon = CATEGORY_ICON[t.category];
          return (
            <ListRow
              key={t.id}
              ariaLabel={`${t.merchant}, ${money(t.amount, t.currency)}, ${formatDate(t.date)}${t.notMyPattern ? ", marked Not my pattern" : ""}`}
              onClick={() => setOpen(t)}
              leading={<RowIcon icon={Icon} tone="neutral" />}
              title={
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{t.merchant}</span>
                  {t.notMyPattern && <Tag tone="gold">Not my pattern</Tag>}
                </span>
              }
              caption={`${t.category} · ${formatDate(t.date)}`}
              trailing={<Money amount={t.amount} currency={t.currency} />}
            />
          );
        })}
      </List>
      {all.length > limit && (
        <Button variant="text" className="mt-2" onClick={() => setLimit((l) => l + PAGE)}>
          Show more payments
        </Button>
      )}
      <PaymentSheet tx={open} open={open !== null} onClose={() => setOpen(null)} />
    </Card>
  );
}
