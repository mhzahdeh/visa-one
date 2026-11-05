// @vitest-environment jsdom
// redesign.test.tsx — the change request's section 5 checks (the 390 x 844 layout
// check runs in a real browser: e2e/layout.e2e.ts).

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Root } from "../../Root";
import { Ring } from "../Ring";
import { LOCALSTORAGE_KEY } from "../../domain/config";
import { buildSeedState } from "../../state/initialState";
import { getMotion } from "../motion";
import { textPairs } from "../tokens";

const setReduced = (v: boolean) =>
  (globalThis as unknown as { __setReducedMotion: (v: boolean) => void }).__setReducedMotion(v);

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
  setReduced(false);
});
afterEach(() => cleanup());

const currentStep = () => {
  const els = document.querySelectorAll("[data-step]");
  return els.length === 1 ? els[0].getAttribute("data-step") : null;
};
const waitForStep = (id: string, timeout = 4000) =>
  waitFor(() => expect(currentStep()).toBe(id), { timeout });

describe("first use (section 3)", () => {
  it("shows S0 to S10 in order, with the right step of 6, one pinned button, and £40 short on S10", async () => {
    render(<Root />);
    const seen: string[] = [];
    const slots: Element[] = [];

    const framedCheck = (n: number) => {
      const bar = screen.getByTestId("step-progress");
      expect(bar.getAttribute("aria-valuenow")).toBe(String(n));
      expect(bar.getAttribute("aria-valuemax")).toBe("6");
      const slot = document.querySelector("[data-slot=primary-action]")!;
      const layout = document.querySelector("[data-layout=first-use-step]")!;
      // The main button sits in the same place: last element of the shared frame.
      expect(layout.lastElementChild).toBe(slot);
      expect(within(slot as HTMLElement).getAllByRole("button")).toHaveLength(1);
      slots.push(slot);
    };

    await waitForStep("S0");
    seen.push("S0");
    await waitForStep("S1", 3000);
    seen.push("S1");
    fireEvent.click(screen.getByRole("button", { name: "Activate Visa One" }));
    await waitForStep("S2");
    seen.push("S2");
    expect(screen.getByText("Student concept. Not an official Visa product.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Get started" }));

    await waitForStep("S3");
    seen.push("S3");
    framedCheck(1);
    const cont = () => document.querySelector("[data-slot=primary-action] button") as HTMLButtonElement;
    expect(cont().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Email or phone"), { target: { value: "sam@example.com" } });
    fireEvent.change(screen.getByLabelText("One-time code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("switch", { name: "I'm 18 or over" }));
    expect(cont().disabled).toBe(false);
    fireEvent.click(cont());

    const framed: [string, number, string][] = [
      ["S4", 2, "Agree and continue"],
      ["S5", 3, "Continue"],
      ["S6", 4, "Continue"],
      ["S7", 5, "Continue"],
      ["S8", 6, "Continue"],
    ];
    for (const [id, n, label] of framed) {
      await waitForStep(id);
      seen.push(id);
      framedCheck(n);
      expect(cont().textContent).toBe(label);
      fireEvent.click(cont());
    }

    await waitForStep("S9");
    seen.push("S9");
    await waitForStep("S10", 4000);
    seen.push("S10");

    expect(seen).toEqual(["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"]);
    // The frame (and its button slot) is one persistent element across S3 to S8.
    expect(new Set(slots).size).toBe(1);
    expect(screen.getByTestId("first-insight").textContent).toBe(
      "Heads up: at this pace you could be about £40 short before your payday on Fri 13 Nov."
    );
  }, 20_000);
});

function startOnboarded(path: string) {
  localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({ ...buildSeedState(), activated: true, onboarded: true }));
  window.location.hash = `#${path}`;
  render(<Root />);
}

async function expectSheetThenClose() {
  const dialog = await screen.findByRole("dialog");
  expect(dialog.getAttribute("data-sheet")).toBe("bottom");
  expect(dialog.getAttribute("aria-modal")).toBe("true");
  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

describe("bottom sheets (section 2.4)", () => {
  it("See why, card actions, add payday, add budget, add goal and Not my pattern all open as bottom sheets", async () => {
    startOnboarded("/home");
    // See why on the hero forecast.
    fireEvent.click((await screen.findAllByRole("button", { name: "See why" }))[0]);
    await expectSheetThenClose();
    // A summary line's why (the hero's "See why" is first, then the summary lines).
    fireEvent.click(screen.getAllByRole("button", { name: "See why" })[1]);
    await expectSheetThenClose();
    // Card actions.
    fireEvent.click(screen.getByRole("button", { name: /Northbank, Northbank, ending 4821/ }));
    const cardSheet = await screen.findByRole("dialog");
    expect(within(cardSheet).getByText("Delete card and its history")).toBeTruthy();
    fireEvent.click(within(cardSheet).getByText("Delete card and its history"));
    // The delete confirmation is the same bottom sheet.
    expect(within(await screen.findByRole("dialog")).getByText(/Your bank card is not affected/)).toBeTruthy();
    await expectSheetThenClose();

    // Plan: add budget, add goal.
    fireEvent.click(screen.getByRole("link", { name: "Plan" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add budget" }));
    await expectSheetThenClose();
    fireEvent.click(screen.getByRole("button", { name: "Add goal" }));
    await expectSheetThenClose();

    // Habits: Not my pattern.
    fireEvent.click(screen.getByRole("link", { name: "Habits" }));
    fireEvent.click(await screen.findByRole("button", { name: /GlowRoom/ }));
    const paymentSheet = await screen.findByRole("dialog");
    expect(paymentSheet.getAttribute("data-sheet")).toBe("bottom");
    fireEvent.click(within(paymentSheet).getByRole("button", { name: "Not my pattern" }));
    expect(await screen.findByText("Marked as Not my pattern")).toBeTruthy();
    expect(within(paymentSheet).getByText(/still counts in what you've spent/)).toBeTruthy();
    await expectSheetThenClose();

    // Control: add payday.
    fireEvent.click(screen.getByRole("link", { name: "Control" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add a payday" }));
    await expectSheetThenClose();
    expect(screen.getByText("Student concept. Not an official Visa product.")).toBeTruthy();
    expect(screen.getByText("Demo date: Wed 4 Nov")).toBeTruthy();
  }, 20_000);

  it("Home keeps the v3 content: £40 short, ≤ 3 summary lines, separate totals and one ≈ total naming the rate", async () => {
    startOnboarded("/home");
    expect((await screen.findAllByText(/About £40 short before payday, Fri 13 Nov/)).length).toBeGreaterThan(0);
    expect(screen.getByTestId("summary-lines").querySelectorAll("li").length).toBeLessThanOrEqual(3);
    const totals = screen.getByTestId("currency-totals").textContent ?? "";
    expect(totals).toContain("£");
    expect(totals).toContain("€");
    expect(screen.getByTestId("base-total").textContent).toMatch(/^≈ £[\d.]+ in total .*€1 = £0\.87/);
  });
});

describe("reduced motion (section 2.5)", () => {
  it("replaces every animation with a 150 ms fade", () => {
    const m = getMotion(true);
    const fades = [m.sheet, m.backdrop, m.toast, m.tab, m.hero, m.reveal];
    for (const f of fades) {
      expect(f.transition).toEqual({ duration: 0.15, ease: "linear" });
      expect(Object.keys(f.initial)).toEqual(["opacity"]);
      expect(Object.keys(f.animate)).toEqual(["opacity"]);
    }
    expect(m.step).toEqual({ enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } });
    expect(m.stepTransition).toEqual({ duration: 0.15, ease: "linear" });
    expect(m.ringDuration).toBe(0);
  });

  it("uses the full motion spec when reduced motion is off", () => {
    const m = getMotion(false);
    expect(m.stepTransition).toMatchObject({ duration: 0.28, ease: "easeOut" });
    expect(m.sheet.transition).toMatchObject({ type: "spring", stiffness: 300, damping: 30 });
    expect(m.tab.transition).toMatchObject({ duration: 0.15 });
    expect(m.ringDuration).toBe(0.8);
  });

  it("without reduced motion the ring amount counts up from zero", () => {
    render(<Ring status="short" amount={40} currency="GBP" fraction={0.26} caption="9 days to payday" />);
    // First frame starts at £0; the count-up runs from there.
    expect(screen.getByTestId("forecast-ring").textContent).toContain("£0");
  });
});

// WCAG relative luminance and contrast ratio.
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function blend(fg: string, bg: string, a: number): string {
  const f = parseInt(fg.slice(1), 16);
  const b = parseInt(bg.slice(1), 16);
  const ch = (sh: number) => Math.round(((f >> sh) & 255) * a + ((b >> sh) & 255) * (1 - a));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

describe("WCAG AA contrast for every text pair in the theme", () => {
  for (const p of textPairs) {
    it(p.name, () => {
      const fg = p.fgAlpha ? blend(p.fg, p.bg, p.fgAlpha) : p.fg;
      const [l1, l2] = [luminance(fg), luminance(p.bg)].sort((a, b) => b - a);
      const ratio = (l1 + 0.05) / (l2 + 0.05);
      expect(ratio).toBeGreaterThanOrEqual(p.large ? 3 : 4.5);
    });
  }
});
