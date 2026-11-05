// Card.tsx — the one card surface (20 px radius, 20 px padding, one soft shadow).

import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
  as: Tag = "section",
  label,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  as?: "section" | "div" | "article";
  label?: string;
}) {
  return (
    <Tag aria-label={label} className={`rounded-card bg-surface shadow-card ${padded ? "p-5" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

/** Card heading row: title (and optional caption) left, an action right. */
export function CardHeader({
  title,
  caption,
  action,
  icon,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-heading text-visa-navy">
          {icon}
          {title}
        </h2>
        {caption && <p className="mt-1 text-caption text-slate">{caption}</p>}
      </div>
      {action && <div className="-my-2 shrink-0">{action}</div>}
    </div>
  );
}

/** Tiny caps label (the only place ALL CAPS is allowed). */
export function Eyebrow({ children, onDark }: { children: ReactNode; onDark?: boolean }) {
  return (
    <p className={`text-caption uppercase tracking-caps ${onDark ? "text-white/70" : "text-slate"}`}>
      {children}
    </p>
  );
}

/** Vertical stack of cards with the 12 px gap and 20 px gutter. */
export function Stack({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-3 px-5 ${className}`}>{children}</div>;
}
