// Field.tsx — text fields and amount fields. There are no number inputs, spinners or
// native selects anywhere: amounts are text inputs with inputMode="decimal", so phones
// open the number keypad (change request 2, section 4).

import { useEffect, useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { CURRENCY_SYMBOL, type CurrencyCode } from "../domain/config";
import { formatAmount } from "../domain/textWriter";

const inputCls =
  "h-12 w-full min-w-0 rounded-input border border-line bg-canvas px-4 text-body text-ink placeholder:text-slate focus:border-visa-blue focus:bg-surface focus:outline-none";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix" | "type"> {
  label: string;
  hint?: string;
  prefix?: ReactNode;
}

export function TextField({ label, hint, prefix, className = "", id, ...rest }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-label text-ink">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-body text-slate">{prefix}</span>
        )}
        <input id={fieldId} type="text" className={`${inputCls} ${prefix ? "pl-9" : ""}`} {...rest} />
      </div>
      {hint && <p className="mt-1.5 text-caption text-slate">{hint}</p>}
    </div>
  );
}

/** Keep digits and one decimal point, at most two decimals. */
export function sanitizeAmount(raw: string): string {
  const cleaned = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole.slice(0, 7);
  return `${whole.slice(0, 7)}.${rest.join("").slice(0, 2)}`;
}

export function parseAmount(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Large amount field for sheets: the amount in display type with its currency symbol.
 * Tapping it opens the number keypad. Optional preset chips set common amounts.
 */
export function AmountField({
  label,
  value,
  onChange,
  currency,
  presets,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  currency: CurrencyCode;
  presets?: number[];
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-label text-ink">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-1 rounded-card bg-canvas px-5 py-3 focus-within:shadow-focus">
        <span className="text-title text-slate" aria-hidden>
          {CURRENCY_SYMBOL[currency]}
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(sanitizeAmount(e.target.value))}
          className="tabular min-w-0 flex-1 bg-transparent text-display text-visa-navy placeholder:text-slate focus:outline-none"
        />
      </div>
      {presets && (
        <div role="group" aria-label={`${label} presets`} className="mt-3 flex flex-wrap gap-2">
          {presets.map((p) => {
            const selected = parseAmount(value) === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(String(p))}
                className={`tabular h-11 rounded-full px-4 text-label transition-colors duration-150 ${
                  selected ? "bg-visa-navy text-white" : "bg-surface text-ink ring-1 ring-inset ring-line"
                }`}
              >
                {CURRENCY_SYMBOL[currency]}
                {p}
              </button>
            );
          })}
        </div>
      )}
      {hint && <p className="mt-2 text-label font-normal text-slate">{hint}</p>}
    </div>
  );
}

/**
 * Compact inline amount input (first use, "See why" sheet). Edits apply live through
 * onChange(number); the text stays as typed while focused.
 */
export function AmountInput({
  label,
  value,
  onChange,
  currency,
  onDone,
  autoFocus,
  showLabel = true,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  currency: CurrencyCode;
  onDone?: () => void;
  autoFocus?: boolean;
  showLabel?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(formatAmount(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(formatAmount(value));
  }, [value, focused]);
  return (
    <div>
      <label htmlFor={id} className={showLabel ? "mb-1.5 block text-label text-ink" : "sr-only"}>
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-body text-slate">
          {CURRENCY_SYMBOL[currency]}
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          value={text}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onDone?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          onChange={(e) => {
            const v = sanitizeAmount(e.target.value);
            setText(v);
            onChange(parseAmount(v));
          }}
          className={`${inputCls} tabular pl-10`}
        />
      </div>
    </div>
  );
}
