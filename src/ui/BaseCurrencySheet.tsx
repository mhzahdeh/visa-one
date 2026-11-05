// BaseCurrencySheet.tsx — choose the base currency for the "≈" total only (R12).
// Edit pattern: segmented choice, live preview of the ≈ total, Save, Cancel, Undo.

import { useEffect, useState } from "react";
import type { CurrencyCode } from "../domain/config";
import { CURRENCY_SYMBOL } from "../domain/config";
import { FX_LABEL, rateLabel } from "../domain/fxRates";
import { baseTotal } from "../domain/forecastRules";
import { money, toastText } from "../domain/textWriter";
import { useStore } from "../state/store";
import { EditSheet } from "./EditSheet";
import { Segmented } from "./Segmented";
import { useUndoableSave } from "./undo";

/** Base currency choices (forecasts, budgets and goals always keep their own currency). */
export const CURRENCIES: CurrencyCode[] = ["GBP", "EUR", "USD"];

export function BaseCurrencySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const commit = useUndoableSave();
  const [choice, setChoice] = useState<CurrencyCode>(state.baseCurrency);
  useEffect(() => {
    if (open) setChoice(state.baseCurrency);
  }, [open, state.baseCurrency]);

  const bt = baseTotal({ ...state, baseCurrency: choice }, "week");
  const usesNok = state.cards.some((c) => c.connected && c.currency === "NOK");

  return (
    <EditSheet
      open={open}
      onClose={onClose}
      title="Base currency"
      caption="For the ≈ total on Home only."
      saveLabel="Save"
      onSave={() => commit(["baseCurrency"], (s) => ({ ...s, baseCurrency: choice }), toastText("baseSaved", state.tone))}
      preview={
        <>
          This week: <span className="tabular font-semibold">≈ {money(bt.amount, bt.base)}</span> in total ({bt.rateNote}).
        </>
      }
    >
      <Segmented
        label="Base currency"
        options={CURRENCIES.map((c) => ({ value: c, label: `${CURRENCY_SYMBOL[c]} ${c}` }))}
        value={choice}
        onChange={setChoice}
      />
      <p className="text-caption text-slate">
        {FX_LABEL}: {rateLabel("EUR", "GBP")}, {rateLabel("USD", "GBP")}, {rateLabel("GBP", "EUR")}, {rateLabel("GBP", "USD")}
        {usesNok ? `, ${rateLabel("NOK", "GBP")}` : ""}.
      </p>
      <p className="text-label font-normal text-ink">
        Used for your approximate total only. Forecasts, budgets and goals stay in their own currency.
      </p>
    </EditSheet>
  );
}
