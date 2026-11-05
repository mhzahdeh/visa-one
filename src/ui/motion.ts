// motion.ts — every animation preset in one place (steering 2.5).
// With prefers-reduced-motion, all of them become simple 150 ms fades.

import { useReducedMotion, type TargetAndTransition, type Transition, type Variants } from "framer-motion";

type T = TargetAndTransition;

const FADE: Transition = { duration: 0.15, ease: "linear" };

export interface MotionPresets {
  reduced: boolean;
  /** First-use step slide. Use with `custom={direction}` (1 forward, -1 back). */
  step: Variants;
  stepTransition: Transition;
  /** Bottom sheet panel and its dimmed backdrop. */
  sheet: { initial: T; animate: T; exit: T; transition: Transition };
  backdrop: { initial: T; animate: T; exit: T; transition: Transition };
  /** Tab change cross-fade. */
  tab: { initial: T; animate: T; transition: Transition };
  /** Toast pill at the top. */
  toast: { initial: T; animate: T; exit: T; transition: Transition };
  /** Hero card "haptic" scale. */
  hero: { initial: T; animate: T; transition: Transition };
  /** Ring draw and amount count-up, in seconds. 0 = show the final value at once. */
  ringDuration: number;
  /** Generic fade-in for ticking lines and inline reveals. */
  reveal: { initial: T; animate: T; transition: Transition };
}

export function getMotion(reduced: boolean): MotionPresets {
  if (reduced) {
    const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: FADE };
    return {
      reduced: true,
      step: { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } },
      stepTransition: FADE,
      sheet: fade,
      backdrop: fade,
      tab: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: FADE },
      toast: fade,
      hero: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: FADE },
      ringDuration: 0,
      reveal: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: FADE },
    };
  }
  return {
    reduced: false,
    step: {
      enter: (dir: number) => ({ x: dir >= 0 ? 56 : -56, opacity: 0 }),
      center: { x: 0, opacity: 1 },
      // The old step leaves quickly so the two steps never overlap for long.
      exit: (dir: number) => ({ x: dir >= 0 ? -56 : 56, opacity: 0, transition: { duration: 0.14, ease: "easeIn" } }),
    },
    stepTransition: { duration: 0.28, ease: "easeOut" },
    sheet: {
      initial: { y: "100%" },
      animate: { y: 0 },
      exit: { y: "100%" },
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 },
    },
    tab: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } },
    toast: {
      initial: { y: -24, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: -24, opacity: 0 },
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
    hero: {
      initial: { scale: 0.98, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      transition: { duration: 0.32, ease: "easeOut" },
    },
    ringDuration: 0.8,
    reveal: {
      initial: { opacity: 0, y: 6 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.25, ease: "easeOut" },
    },
  };
}

export function useMotion(): MotionPresets {
  return getMotion(useReducedMotion() ?? false);
}
