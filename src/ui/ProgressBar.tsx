// ProgressBar.tsx — gold progress fill, the 6-part first-use step bar, and skeletons.

import { motion } from "framer-motion";
import { useMotion } from "./motion";

export function ProgressBar({
  fraction,
  label,
  over,
}: {
  fraction: number;
  label: string;
  /** Over a budget: calm amber fill (never red). The words say it too. */
  over?: boolean;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-line"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-150 ${over ? "bg-headsup" : "bg-visa-gold"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** First-use step bar: 6 parts, filled in gold. */
export function StepProgress({ step, total = 6 }: { step: number; total?: number }) {
  const m = useMotion();
  return (
    <div
      role="progressbar"
      aria-label={`Step ${step} of ${total}`}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      data-testid="step-progress"
      className="flex flex-1 gap-1"
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
          <motion.span
            className="block h-full rounded-full bg-visa-gold"
            initial={false}
            animate={{ width: i < step ? "100%" : "0%" }}
            transition={m.reduced ? { duration: 0.15 } : { duration: 0.28, ease: "easeOut" }}
          />
        </span>
      ))}
    </div>
  );
}

/** Skeleton block in line colour with a slow shimmer (no spinners). */
export function Skeleton({ className = "", still }: { className?: string; still?: boolean }) {
  return (
    <span
      aria-hidden
      className={`block rounded-full ${still ? "bg-line" : "animate-shimmer bg-shimmer bg-[length:200%_100%]"} ${className}`}
    />
  );
}

/** Empty state: still skeleton lines and one short sentence. */
export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 py-2">
      <Skeleton still className="h-3 w-2/3" />
      <Skeleton still className="h-3 w-1/2" />
      <p className="mt-1 text-label font-normal text-slate">{text}</p>
    </div>
  );
}
