// ListRow.tsx — 64 px rows: 40 px leading icon or tile, title and caption left,
// amount right in tabular figures (steering 2.4).

import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { ICON } from "./icons";

interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  caption?: ReactNode;
  trailing?: ReactNode;
  trailingCaption?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  /** Let the title wrap (tips, long sentences) instead of truncating. */
  wrap?: boolean;
  ariaLabel?: string;
}

export function ListRow({
  leading,
  title,
  caption,
  trailing,
  trailingCaption,
  onClick,
  chevron,
  wrap,
  ariaLabel,
}: ListRowProps) {
  const body = (
    <>
      {leading && <div className="flex h-10 w-10 shrink-0 items-center justify-center">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className={`text-body font-medium text-ink ${wrap ? "" : "truncate"}`}>{title}</div>
        {caption && <div className={`mt-0.5 text-caption text-slate ${wrap ? "" : "truncate"}`}>{caption}</div>}
      </div>
      {(trailing || trailingCaption) && (
        <div className="shrink-0 text-right">
          {trailing && <div className="tabular text-body font-semibold text-ink">{trailing}</div>}
          {trailingCaption && <div className="mt-0.5 text-caption text-slate">{trailingCaption}</div>}
        </div>
      )}
      {chevron && <ChevronRight size={ICON.sm} strokeWidth={ICON.stroke} className="shrink-0 text-slate" aria-hidden />}
    </>
  );
  const cls = "flex min-h-row w-full items-center gap-3 py-2 text-left";
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={`${cls} active:bg-canvas`}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

/** Rows separated by hairline dividers. */
export function List({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-line">{children}</div>;
}

/** The 40 px round icon used as a row's leading element. */
export function RowIcon({ icon: Icon, tone = "blue" }: { icon: LucideIcon; tone?: "blue" | "ok" | "neutral" | "gold" }) {
  const palette = {
    blue: "bg-blue-tint text-visa-blue",
    ok: "bg-ok-tint text-ok-ink",
    neutral: "bg-canvas text-slate",
    gold: "bg-gold-tint text-gold-ink",
  }[tone];
  return (
    <span className={`flex h-10 w-10 items-center justify-center rounded-full ${palette}`}>
      <Icon size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden />
    </span>
  );
}
