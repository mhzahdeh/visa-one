// Chip.tsx — selectable chips, chip groups and status chips.

import type { ReactNode } from "react";
import { CircleCheck, TriangleAlert, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { ICON } from "./icons";

export function Chip({
  selected,
  onClick,
  children,
  icon,
  onDark,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  icon?: ReactNode;
  onDark?: boolean;
}) {
  const palette = onDark
    ? selected
      ? "bg-white text-visa-navy"
      : "bg-white/10 text-white"
    : selected
    ? "bg-visa-navy text-white"
    : "bg-surface text-ink ring-1 ring-inset ring-line";
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-label transition-colors duration-150 ${palette}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** A wrapping row of chips. Never scrolls sideways. */
export function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {children}
    </div>
  );
}

/** Status is never colour alone: always an icon and words too. */
export function StatusChip({
  status,
  children,
  onDark,
}: {
  status: "ok" | "headsup";
  children: ReactNode;
  onDark?: boolean;
}) {
  const Icon = status === "ok" ? CircleCheck : TriangleAlert;
  const palette = onDark
    ? status === "ok"
      ? "bg-white/10 text-ok"
      : "bg-white/10 text-headsup"
    : status === "ok"
    ? "bg-ok-tint text-ok-ink"
    : "bg-headsup-tint text-headsup-ink";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption ${palette}`}>
      <Icon size={14} strokeWidth={ICON.stroke} aria-hidden />
      {children}
    </span>
  );
}

/** Small neutral tag, e.g. "Not my pattern" or "Not in totals". */
export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "gold" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-caption ${
        tone === "gold" ? "bg-gold-tint text-gold-ink" : "bg-canvas text-slate"
      }`}
    >
      {children}
    </span>
  );
}

/** Trend vs the user's own usual: icon + word, never colour alone. */
export function Trend({ trend }: { trend: "up" | "down" | "steady" }) {
  const map = {
    up: { Icon: TrendingUp, word: "Up", cls: "text-headsup-ink" },
    down: { Icon: TrendingDown, word: "Down", cls: "text-ok-ink" },
    steady: { Icon: Minus, word: "Steady", cls: "text-slate" },
  } as const;
  const { Icon, word, cls } = map[trend];
  return (
    <span className={`inline-flex items-center gap-1 text-caption ${cls}`}>
      <Icon size={14} strokeWidth={ICON.stroke} aria-hidden />
      {word}
    </span>
  );
}
