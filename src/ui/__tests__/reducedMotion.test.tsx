// @vitest-environment jsdom
// reducedMotion.test.tsx — WHEN reduced motion is switched on THEN animations are
// replaced by simple fades. Own file: framer-motion reads the setting once per load.

import { describe, expect, it } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";
import { useMotion } from "../motion";
import { Ring } from "../Ring";

(globalThis as unknown as { __setReducedMotion: (v: boolean) => void }).__setReducedMotion(true);

describe("with prefers-reduced-motion: reduce", () => {
  it("every preset is a 150 ms fade", () => {
    const { result } = renderHook(() => useMotion());
    expect(result.current.reduced).toBe(true);
    expect(result.current.sheet.initial).toEqual({ opacity: 0 });
    expect(result.current.sheet.transition).toEqual({ duration: 0.15, ease: "linear" });
    expect(result.current.ringDuration).toBe(0);
  });

  it("the ring shows its final amount at once, with no draw or count-up", () => {
    render(<Ring status="short" amount={40} currency="GBP" fraction={0.26} caption="9 days to payday" />);
    expect(screen.getByTestId("forecast-ring").textContent).toContain("£40");
  });
});
