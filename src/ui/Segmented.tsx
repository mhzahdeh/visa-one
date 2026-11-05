// Segmented.tsx — segmented control for periods, currencies and frequencies.
// Replaces native selects (change request 2, section 4).

import { useId } from "react";

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  showLabel = true,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  showLabel?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <p id={id} className={showLabel ? "mb-1.5 text-label text-ink" : "sr-only"}>
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={id} className="flex gap-1 rounded-full bg-canvas p-1">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(o.value)}
              className={`min-h-11 min-w-0 flex-1 truncate rounded-full px-2 text-label transition-colors duration-150 ${
                selected ? "bg-surface font-semibold text-ink shadow-card" : "text-slate"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
