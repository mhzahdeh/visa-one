// Slider.tsx — a range slider for what-if values (daily spend in the forecast).

import { useId } from "react";
import type { CSSProperties } from "react";

export function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  display,
  caption,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  /** Formatted current value, shown right of the label. */
  display: string;
  caption?: string;
}) {
  const id = useId();
  const fill = `${((Math.min(max, Math.max(min, value)) - min) / (max - min || 1)) * 100}%`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label text-ink">
          {label}
        </label>
        <span className="tabular text-body font-semibold text-ink">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider w-full"
        style={{ "--fill": fill } as CSSProperties}
      />
      {caption && <p className="text-caption text-slate">{caption}</p>}
    </div>
  );
}
