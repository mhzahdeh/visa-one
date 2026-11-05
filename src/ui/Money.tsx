// Money.tsx — amounts in tabular figures with the currency symbol at 60 percent of the
// number's size, top-aligned. Font size comes from the parent (text-display, text-title…).

import { CURRENCY_SYMBOL, symbolGap, type CurrencyCode } from "../domain/config";
import { formatAmount } from "../domain/textWriter";

export function Money({
  amount,
  currency,
  prefix,
  className = "",
}: {
  amount: number;
  currency: CurrencyCode;
  /** e.g. "≈" or "−" before the symbol. */
  prefix?: string;
  className?: string;
}) {
  const sym = CURRENCY_SYMBOL[currency];
  const num = formatAmount(amount);
  const spoken = `${prefix ?? ""}${sym}${symbolGap(currency)}${num}`;
  return (
    <span className={`tabular whitespace-nowrap ${className}`}>
      <span className="sr-only">{spoken}</span>
      <span aria-hidden className="inline-flex items-start">
        {prefix && <span className="mr-[0.15em]">{prefix}</span>}
        <span className={`${symbolGap(currency) ? "mr-[0.15em]" : "mr-[0.04em]"} mt-[0.12em] text-[0.6em] leading-none`}>{sym}</span>
        <span>{num}</span>
      </span>
    </span>
  );
}
