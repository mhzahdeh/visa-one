// DatePicker.tsx — a month calendar used inside sheets for payday dates.
// Dates before the demo date are disabled (R13: anchored to DEMO_TODAY).

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_NAMES, TODAY_ISO, formatDate, monthGrid, parseISO } from "../domain/dates";
import { IconButton } from "./Button";
import { ICON } from "./icons";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function DatePicker({
  label,
  value,
  onChange,
  min = TODAY_ISO,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
}) {
  const start = parseISO(value || min);
  const [year, setYear] = useState(start.getFullYear());
  const [month, setMonth] = useState(start.getMonth());
  const minDate = parseISO(min);
  const atMin = year === minDate.getFullYear() && month === minDate.getMonth();

  const shift = (d: number) => {
    const next = new Date(year, month + d, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  return (
    <div role="group" aria-label={label}>
      <p className="mb-1.5 text-label text-ink">{label}</p>
      <div className="rounded-card bg-canvas p-3">
        <div className="flex items-center justify-between">
          <IconButton label="Previous month" onClick={() => !atMin && shift(-1)}>
            <ChevronLeft size={ICON.sm} strokeWidth={ICON.stroke} className={atMin ? "opacity-30" : ""} />
          </IconButton>
          <p className="text-body font-semibold text-ink" aria-live="polite">
            {MONTH_NAMES[month]} {year}
          </p>
          <IconButton label="Next month" onClick={() => shift(1)}>
            <ChevronRight size={ICON.sm} strokeWidth={ICON.stroke} />
          </IconButton>
        </div>
        <div className="mt-1 grid grid-cols-7 text-center" aria-hidden>
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="py-1 text-caption text-slate">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {monthGrid(year, month).map((iso, i) => {
            if (!iso) return <span key={`pad-${i}`} />;
            const disabled = iso < min;
            const selected = iso === value;
            const today = iso === TODAY_ISO;
            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={formatDate(iso)}
                onClick={() => onChange(iso)}
                className={`tabular mx-auto flex h-11 w-11 items-center justify-center rounded-full text-label transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-30 ${
                  selected ? "bg-visa-blue font-semibold text-white" : today ? "text-visa-blue ring-1 ring-inset ring-visa-blue" : "text-ink"
                }`}
              >
                {Number(iso.slice(8))}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
