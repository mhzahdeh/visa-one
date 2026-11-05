// WhySheet.tsx — every insight, summary line, tip and reward has a "why" (R8).
// It opens as a bottom sheet and is logged to Control's "Why did I see this?" log.

import { useState } from "react";
import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";
import { useStore } from "../state/store";
import type { WhyLogEntry } from "../domain/types";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { ICON } from "./icons";

export interface WhyContent {
  kind: WhyLogEntry["kind"];
  /** The user-facing text this "why" explains. */
  forText: string;
  /** The rule in forecastRules.ts that produced the numbers. */
  rule: string;
  /** The payments, dates and maths used. */
  detail: ReactNode;
  /** Plain-text version of detail for the log. */
  detailText: string;
  /** One plain sentence explaining the idea behind it. */
  principle?: string;
}

export function WhySheet({ open, onClose, why }: { open: boolean; onClose: () => void; why: WhyContent }) {
  return (
    <Sheet open={open} onClose={onClose} title="Why you're seeing this">
      <div className="flex flex-col gap-4">
        <p className="rounded-input bg-canvas p-4 text-body text-ink">{why.forText}</p>
        <div>
          <p className="text-caption uppercase tracking-caps text-slate">How we worked it out</p>
          <div className="tabular mt-1 text-body text-ink">{why.detail}</div>
        </div>
        {why.principle && (
          <p className="flex gap-3 text-label font-normal text-ink">
            <Lightbulb size={ICON.sm} strokeWidth={ICON.stroke} className="mt-0.5 shrink-0 text-visa-blue" aria-hidden />
            {why.principle}
          </p>
        )}
        <p className="text-caption text-slate">Rule: {why.rule}</p>
      </div>
    </Sheet>
  );
}

/** Opens a WhySheet and logs it. Returns [open function, sheet element]. */
export function useWhy(why: WhyContent): [() => void, ReactNode] {
  const { logWhy } = useStore();
  const [open, setOpen] = useState(false);
  const openSheet = () => {
    setOpen(true);
    logWhy({ kind: why.kind, text: why.forText, rule: why.rule, detail: why.principle ? `${why.detailText} ${why.principle}` : why.detailText });
  };
  return [openSheet, <WhySheet key="why" open={open} onClose={() => setOpen(false)} why={why} />];
}

/** A "See why" text button wired to a WhySheet. */
export function WhyButton({
  why,
  label = "See why",
  onDark,
}: {
  why: WhyContent;
  label?: string;
  onDark?: boolean;
}) {
  const [open, sheet] = useWhy(why);
  return (
    <>
      <Button variant={onDark ? "text-on-dark" : "text"} onClick={open}>
        {label}
      </Button>
      {sheet}
    </>
  );
}
