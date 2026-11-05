// MoneySheet.tsx — edit "money until your next payday" for one currency, with a live
// preview of the forecast it gives.

import { useEffect, useState } from "react";
import type { CurrencyCode } from "../domain/config";
import { forecastForCurrency } from "../domain/forecastRules";
import { forecastRingCaption, toastText } from "../domain/textWriter";
import { useStore } from "../state/store";
import { EditSheet } from "../ui/EditSheet";
import { AmountField, parseAmount } from "../ui/Field";
import { useUndoableSave } from "../ui/undo";
import { presetsFor } from "./PlanSheets";

export function MoneySheet({ open, onClose, currency }: { open: boolean; onClose: () => void; currency: CurrencyCode }) {
  const { state } = useStore();
  const commit = useUndoableSave();
  const [amount, setAmount] = useState("");
  useEffect(() => {
    if (open) setAmount(String(state.moneyUntilPayday[currency] ?? 0));
    // Only reset when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currency]);

  const value = parseAmount(amount);
  const preview = forecastForCurrency({ ...state, moneyUntilPayday: { ...state.moneyUntilPayday, [currency]: value } }, currency);

  return (
    <EditSheet
      open={open}
      onClose={onClose}
      title={`Money until payday, ${currency}`}
      caption="Roughly how much you have to live on until your next payday."
      saveLabel="Save"
      onSave={() =>
        commit(
          ["moneyUntilPayday"],
          (s) => ({ ...s, moneyUntilPayday: { ...s.moneyUntilPayday, [currency]: value } }),
          toastText("moneySaved", state.tone)
        )
      }
      preview={preview ? <>Your forecast: <span className="font-semibold">{forecastRingCaption(preview)}</span></> : "Add a payday in this currency to get a forecast."}
    >
      <AmountField label="Amount" currency={currency} value={amount} onChange={setAmount} presets={presetsFor(currency, "money")} />
    </EditSheet>
  );
}
