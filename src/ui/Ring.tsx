// Ring.tsx — the payday forecast ring: 160 px, 10 px stroke, rounded caps, amber or
// green arc. Draws from 0 in 800 ms while the amount counts up (steering 2.4, 2.5).
// Status is never colour alone: the ring also carries an icon and words.

import { useEffect, useState } from "react";
import { animate, motion } from "framer-motion";
import { CircleCheck, TriangleAlert } from "lucide-react";
import type { CurrencyCode } from "../domain/config";
import type { Forecast } from "../domain/forecastRules";
import { color } from "./tokens";
import { useMotion } from "./motion";
import { Money } from "./Money";
import { ICON } from "./icons";

interface RingProps {
  status: "short" | "ok";
  /** Whole-unit amount shown inside ("about" amount from textWriter). */
  amount: number;
  currency: CurrencyCode;
  /** 0..1 length of the arc. */
  fraction: number;
  caption: string;
  onDark?: boolean;
}

const SIZE = 160;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;

export function Ring({ status, amount, currency, fraction, caption, onDark = true }: RingProps) {
  const m = useMotion();
  const shown = useCountUp(amount, m.ringDuration);
  const arc = status === "short" ? color.headsUp : color.ok;
  const Icon = status === "short" ? TriangleAlert : CircleCheck;
  const word = status === "short" ? "Short by" : "Safe to spend";
  const clamped = Math.max(0.02, Math.min(1, fraction));
  const textCls = onDark ? "text-white" : "text-ink";

  return (
    <div className="flex flex-col items-center" data-testid="forecast-ring">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={onDark ? color.surface : color.line}
            strokeOpacity={onDark ? 0.12 : 1}
            strokeWidth={STROKE}
          />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={arc}
            strokeWidth={STROKE}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            initial={{ pathLength: m.ringDuration ? 0 : clamped }}
            animate={{ pathLength: clamped }}
            transition={{ duration: m.ringDuration, ease: "easeOut" }}
          />
        </svg>
        <div className={`absolute inset-0 flex flex-col items-center justify-center ${textCls}`}>
          <span className={`flex items-center gap-1 text-caption ${status === "short" ? "text-headsup" : "text-ok"}`}>
            <Icon size={14} strokeWidth={ICON.stroke} aria-hidden />
            <span className={onDark ? "text-white/70" : "text-slate"}>{word}</span>
          </span>
          <span className="text-display">
            <Money amount={shown} currency={currency} />
          </span>
        </div>
      </div>
      <p className={`mt-2 text-label ${onDark ? "text-white/70" : "text-slate"}`}>{caption}</p>
    </div>
  );
}

/** Arc length: share of the money left when on track, size of the gap when short. */
export function ringFraction(f: Forecast): number {
  const pot = Math.max(1, f.assumptions.moneyUntilPayday);
  return Math.min(1, (f.short ? f.shortfall : f.safeToSpend) / pot);
}

/** Count from 0 to `target` (whole numbers) over `duration` seconds. 0 = no animation. */
function useCountUp(target: number, duration: number): number {
  const [value, setValue] = useState(duration ? 0 : target);
  useEffect(() => {
    if (!duration) {
      setValue(target);
      return;
    }
    const controls = animate(0, target, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, duration]);
  return value;
}
