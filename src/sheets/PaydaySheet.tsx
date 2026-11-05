// PaydaySheet.tsx — add or edit a payday: calendar date picker, segmented frequency and
// currency, amount with the number keypad, live preview, Save, Cancel, Remove.

import { useEffect, useState } from "react";
import type { CurrencyCode } from "../domain/config";
import { TODAY_ISO, addDays, daysFromToday, formatDate } from "../domain/dates";
import { money, toastText } from "../domain/textWriter";
import type { Payday } from "../domain/types";
import { removePayday, savePayday, useStore } from "../state/store";
import { EditSheet } from "../ui/EditSheet";
import { AmountField, TextField, parseAmount } from "../ui/Field";
import { Segmented } from "../ui/Segmented";
import { DatePicker } from "../ui/DatePicker";
import { useUndoableSave } from "../ui/undo";
import { useCurrencyOptions } from "./PlanSheets";

const FREQUENCIES: { value: Payday["frequency"]; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "one-off", label: "One-off" },
];

export function frequencyLabel(f: Payday["frequency"]): string {
  return { weekly: "Weekly", fortnightly: "Every two weeks", monthly: "Monthly", "one-off": "One-off" }[f];
}

export function PaydaySheet({
  open,
  onClose,
  payday,
  defaultCurrency = "GBP",
}: {
  open: boolean;
  onClose: () => void;
  payday?: Payday;
  defaultCurrency?: CurrencyCode;
}) {
  const { state } = useStore();
  const commit = useUndoableSave();
  const [name, setName] = useState("");
  const [nextDate, setNextDate] = useState(addDays(TODAY_ISO, 14));
  const [frequency, setFrequency] = useState<Payday["frequency"]>("monthly");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const currencies = useCurrencyOptions(currency);

  useEffect(() => {
    if (!open) return;
    setName(payday?.name ?? "");
    setNextDate(payday?.nextDate ?? addDays(TODAY_ISO, 14));
    setFrequency(payday?.frequency ?? "monthly");
    setAmount(payday ? String(payday.amount) : "");
    setCurrency(payday?.currency ?? defaultCurrency);
  }, [open, payday, defaultCurrency]);

  const value = parseAmount(amount);
  const valid = name.trim().length > 0 && value > 0 && nextDate >= TODAY_ISO;
  const days = daysFromToday(nextDate);

  return (
    <EditSheet
      open={open}
      onClose={onClose}
      title={payday ? "Edit payday" : "Add a payday"}
      caption="Visa can't see your income, so you tell us."
      canSave={valid}
      saveLabel="Save payday"
      onSave={() =>
        commit(
          ["paydays", "moneyUntilPayday"],
          (s) =>
            savePayday(s, { id: payday?.id ?? `p-${Date.now()}`, name: name.trim(), nextDate, frequency, amount: value, currency }),
          toastText("paydaySaved", state.tone)
        )
      }
      onDelete={payday ? () => commit(["paydays"], (s) => removePayday(s, payday.id), toastText("paydayRemoved", state.tone)) : undefined}
      deleteLabel="Remove payday"
      deleteConfirm={payday ? `This removes “${payday.name}”. Your ${payday.currency} forecast will use your next ${payday.currency} payday, if you have one.` : undefined}
      preview={
        <>
          Next payday <span className="font-semibold">{formatDate(nextDate)}</span>, in {days} day{days === 1 ? "" : "s"}
          {value > 0 ? ` · ${money(value, currency)}, ${frequencyLabel(frequency).toLowerCase()}` : ""}.
        </>
      }
    >
      <TextField label="Name" placeholder="For example, Café job" value={name} onChange={(e) => setName(e.target.value)} />
      <DatePicker label="Next payday" value={nextDate} onChange={setNextDate} />
      <Segmented label="How often" options={FREQUENCIES} value={frequency} onChange={setFrequency} />
      <AmountField label="Rough amount" currency={currency} value={amount} onChange={setAmount} />
      {currencies.length > 1 && <Segmented label="Currency" options={currencies} value={currency} onChange={setCurrency} />}
    </EditSheet>
  );
}
