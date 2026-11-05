// PlanSheets.tsx — budget sheet (create and edit are the same sheet) and goal sheet.
// Amount field with the number keypad and presets, segmented period and currency,
// category chips, a live preview, Save, Cancel and Delete with confirm.

import { useEffect, useState } from "react";
import { CURRENCY_SYMBOL, type CurrencyCode } from "../domain/config";
import type { Budget, BudgetPeriod, Goal, SpendCategory } from "../domain/types";
import { money, periodAdjective, periodNoun, toastText } from "../domain/textWriter";
import { perDayOf, suggestedBudget } from "../domain/planRules";
import { removeBudget, removeGoal, saveBudget, saveGoal, useStore } from "../state/store";
import { EditSheet } from "../ui/EditSheet";
import { AmountField, TextField, parseAmount } from "../ui/Field";
import { Segmented } from "../ui/Segmented";
import { Chip, ChipGroup } from "../ui/Chip";
import { useUndoableSave } from "../ui/undo";

export const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: "daily", label: "Day" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
];

const BUDGET_CATEGORIES: (SpendCategory | "All")[] = ["All", "Takeaways", "Groceries", "Transport", "Clothes", "Other"];

const ORDER: CurrencyCode[] = ["GBP", "EUR", "NOK", "USD"];

/** Currencies the user actually uses (connected cards), GBP first. */
export function useCurrencyOptions(include?: CurrencyCode) {
  const { state } = useStore();
  const used = new Set<CurrencyCode>(["GBP", ...state.cards.filter((c) => c.connected).map((c) => c.currency)]);
  if (include) used.add(include);
  return ORDER.filter((c) => used.has(c)).map((c) => ({ value: c, label: `${CURRENCY_SYMBOL[c]} ${c}` }));
}

export function presetsFor(currency: CurrencyCode, kind: "budget" | "goal" | "money"): number[] {
  const scale = currency === "NOK" ? 10 : 1;
  const base = kind === "budget" ? [50, 80, 100, 150] : kind === "goal" ? [20, 50, 100] : [50, 100, 150, 200];
  return base.map((n) => n * scale);
}

export function categoryLabel(c: SpendCategory | "All"): string {
  return c === "All" ? "All spending" : c;
}

export function BudgetSheet({
  open,
  onClose,
  budget,
  prefill,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Editing an existing budget. */
  budget?: Budget;
  /** Pre-filled values for a new budget (e.g. from the forecast after S10). */
  prefill?: Partial<Budget>;
  onSaved?: () => void;
}) {
  const { state } = useStore();
  const commit = useUndoableSave();
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("weekly");
  const [category, setCategory] = useState<SpendCategory | "All">("All");
  const [currency, setCurrency] = useState<CurrencyCode>("GBP");
  const currencies = useCurrencyOptions(currency);

  useEffect(() => {
    if (!open) return;
    const p = budget ?? prefill ?? {};
    const cur = p.currency ?? "GBP";
    const per = p.period ?? "weekly";
    setCurrency(cur);
    setPeriod(per);
    setCategory(p.category ?? "All");
    const start = p.limit ?? suggestedBudget(state, cur, per) ?? 80;
    setAmount(String(start));
    // Only reset when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const limit = parseAmount(amount);
  const suggestion = suggestedBudget(state, currency, period);
  const daily = perDayOf(limit, period);
  const isNew = !budget;

  return (
    <EditSheet
      open={open}
      onClose={onClose}
      title={isNew ? "Set a budget" : "Edit budget"}
      caption="A budget is your own limit. It never changes your forecast."
      canSave={limit > 0}
      saveLabel="Save budget"
      onSave={() => {
        const next: Budget = { id: budget?.id ?? `b-${Date.now()}`, category, currency, limit, period };
        commit(["budgets"], (s) => saveBudget(s, next), toastText("budgetSaved", state.tone));
        onSaved?.();
      }}
      onDelete={budget ? () => commit(["budgets"], (s) => removeBudget(s, budget.id), toastText("budgetDeleted", state.tone)) : undefined}
      deleteLabel="Delete budget"
      deleteConfirm={
        budget
          ? `This deletes your ${money(budget.limit, budget.currency)} ${periodAdjective(budget.period)} budget for ${categoryLabel(
              budget.category
            ).toLowerCase()}. Your payments and your forecast don't change.`
          : undefined
      }
      preview={
        limit > 0 ? (
          <>
            {money(limit, currency)} a {periodNoun(period)} for {categoryLabel(category).toLowerCase()}.{" "}
            {period === "daily" ? (
              <span className="font-semibold">That's {money(limit * 7, currency)} a week.</span>
            ) : (
              <span className="font-semibold">That's about {money(daily, currency)} a day.</span>
            )}
          </>
        ) : (
          "Enter an amount to see how it works out."
        )
      }
    >
      <AmountField
        label="Amount"
        currency={currency}
        value={amount}
        onChange={setAmount}
        presets={presetsFor(currency, "budget")}
        hint={
          suggestion !== null && suggestion > 0
            ? `Based on your money until payday: about ${money(suggestion, currency)} a ${periodNoun(period)}.`
            : undefined
        }
      />
      <Segmented label="Period" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
      <div>
        <p className="mb-1.5 text-label text-ink">Category</p>
        <ChipGroup label="Category">
          {[...new Set([...BUDGET_CATEGORIES, category])].map((c) => (
            <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>
              {categoryLabel(c)}
            </Chip>
          ))}
        </ChipGroup>
      </div>
      {currencies.length > 1 && <Segmented label="Currency" options={currencies} value={currency} onChange={setCurrency} />}
    </EditSheet>
  );
}

function autoGoalName(amount: number, currency: CurrencyCode, period: BudgetPeriod): string {
  return `Keep ${money(amount, currency)} aside this ${periodNoun(period)}`;
}

export function GoalSheet({ open, onClose, goal }: { open: boolean; onClose: () => void; goal?: Goal }) {
  const { state } = useStore();
  const commit = useUndoableSave();
  const [amount, setAmount] = useState("50");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [currency, setCurrency] = useState<CurrencyCode>("GBP");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const currencies = useCurrencyOptions(currency);

  useEffect(() => {
    if (!open) return;
    setAmount(String(goal?.amount ?? 50));
    setPeriod(goal?.period ?? "monthly");
    setCurrency(goal?.currency ?? "GBP");
    setName(goal?.name ?? "");
    setNameTouched(Boolean(goal));
  }, [open, goal]);

  const value = parseAmount(amount);
  // The name follows the amount and period until the user types their own.
  const shownName = nameTouched ? name : autoGoalName(value, currency, period);

  return (
    <EditSheet
      open={open}
      onClose={onClose}
      title={goal ? "Adjust your goal" : "Add a goal"}
      caption="Your own goal. No streaks, no points."
      canSave={value > 0 && shownName.trim().length > 0}
      saveLabel="Save goal"
      onSave={() =>
        commit(
          ["goals"],
          (s) => saveGoal(s, { id: goal?.id ?? `g-${Date.now()}`, name: shownName.trim(), amount: value, currency, period }),
          toastText("goalSaved", state.tone)
        )
      }
      onDelete={goal ? () => commit(["goals"], (s) => removeGoal(s, goal.id), toastText("goalDeleted", state.tone)) : undefined}
      deleteLabel="Delete goal"
      deleteConfirm={goal ? `This deletes your goal “${goal.name}”.` : undefined}
      preview={
        value > 0 ? (
          <>
            <span className="font-semibold">{autoGoalName(value, currency, period)}.</span>{" "}
            {period === "daily" ? "Daily goals never unlock rewards." : "Weekly, monthly and yearly goals can unlock a reward if you switch rewards on."}
          </>
        ) : (
          "Enter an amount to see your goal."
        )
      }
    >
      <AmountField label="Amount to keep aside" currency={currency} value={amount} onChange={setAmount} presets={presetsFor(currency, "goal")} />
      <Segmented label="Period" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
      {currencies.length > 1 && <Segmented label="Currency" options={currencies} value={currency} onChange={setCurrency} />}
      <TextField
        label="Goal name"
        value={shownName}
        onChange={(e) => {
          setNameTouched(true);
          setName(e.target.value);
        }}
      />
    </EditSheet>
  );
}
