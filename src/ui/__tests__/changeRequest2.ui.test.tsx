// @vitest-environment jsdom
// changeRequest2.ui.test.tsx — change request 2, section 6 (UI level). The real-browser
// check (no sideways scroll, budget hero above the fold, no spinners) is e2e/layout.e2e.ts.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Root } from "../../Root";
import { LOCALSTORAGE_KEY, type Tone } from "../../domain/config";
import { buildSeedState } from "../../state/initialState";
import { saveBudget, saveGoal } from "../../state/store";
import { countEmoji } from "../../domain/guardrails";
import type { AppState } from "../../domain/types";

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
});
afterEach(() => cleanup());

function start(path: string, patch: (s: AppState) => AppState = (s) => s) {
  const s = patch({ ...buildSeedState(), activated: true, onboarded: true });
  localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(s));
  window.location.hash = `#${path}`;
  return render(<Root />);
}
const stored = (): AppState => JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY)!);
const withBudget = (s: AppState) => saveBudget(s, { id: "b1", category: "All", currency: "GBP", limit: 80, period: "weekly" });
const tab = (name: string) => fireEvent.click(screen.getByRole("link", { name }));
const closeSheet = async () => {
  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
};

describe("Sassy tone when short", () => {
  it("summary is sassy with emoji, about £40, Fri 13 Nov, See why, and Too much? Switch to Personal", async () => {
    start("/home", (s) => ({ ...s, tone: "Sassy" }));
    const lines = await screen.findByTestId("summary-lines");
    const first = lines.querySelector("li")!;
    const text = first.querySelector("p")!.textContent!;
    expect(text).toMatch(/^Gurlllll what the hell are you doing\?/);
    expect(countEmoji(text)).toBeGreaterThanOrEqual(1);
    expect(text).toContain("about £40");
    expect(text).toContain("Fri 13 Nov");
    expect(within(first).getByRole("button", { name: "See why" })).toBeTruthy();
    const sw = within(first).getByRole("button", { name: "Too much? Switch to Personal" });

    fireEvent.click(sw);
    expect(await screen.findByText("Switched to Personal")).toBeTruthy();
    await waitFor(() => expect(stored().tone).toBe("Personal"));
    const calm = screen.getByTestId("summary-lines").querySelector("li p")!.textContent!;
    expect(calm).toBe("Heads up: at this pace you could be about £40 short before your payday on Fri 13 Nov.");
    expect(screen.queryByRole("button", { name: "Too much? Switch to Personal" })).toBeNull();
  });

  it("Professional and Personal are calm with no emoji and no switch button", async () => {
    for (const tone of ["Professional", "Personal"] as Tone[]) {
      start("/home", (s) => ({ ...s, tone }));
      const lines = await screen.findByTestId("summary-lines");
      expect(countEmoji(lines.textContent!)).toBe(0);
      expect(lines.querySelector("li p")!.textContent).toMatch(/^Heads up:/);
      expect(screen.queryByRole("button", { name: "Too much? Switch to Personal" })).toBeNull();
      cleanup();
    }
  });

  it("Ask: a Sassy shortfall answer offers the switch too", async () => {
    start("/ask", (s) => ({ ...s, tone: "Sassy" }));
    fireEvent.click(await screen.findByRole("button", { name: "Can I afford £30 on Saturday?" }));
    expect(await screen.findByText(/^Bestie\. No\. 💀 That would put you about £70 short before Fri 13 Nov/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Too much? Switch to Personal" })).toBeTruthy();
  });
});

describe("rewards hidden when short, in every tone (R4)", () => {
  // A met weekly EUR goal with rewards switched on: rewards would show if nothing were short.
  const rewardReady = (tone: Tone, gbp = 155) => (s: AppState) =>
    saveGoal(
      { ...s, tone, consent: { ...s.consent, personalisedRewards: true }, moneyUntilPayday: { ...s.moneyUntilPayday, GBP: gbp } },
      { id: "g1", name: "Keep €10 aside this week", currency: "EUR", amount: 10, period: "weekly" }
    );

  it("no Partner reward on Plan while the GBP forecast is short", async () => {
    for (const tone of ["Professional", "Personal", "Sassy"] as Tone[]) {
      start("/plan", rewardReady(tone));
      await screen.findByText("Your budget, goals and forecast.");
      expect(screen.queryByText("Partner reward")).toBeNull();
      cleanup();
    }
  });

  it("control case: the same reward shows once nothing is short", async () => {
    start("/plan", rewardReady("Sassy", 400));
    expect(await screen.findByText("Partner reward")).toBeTruthy();
  });
});

describe("budgets", () => {
  it("Plan opens with the main budget: amount and amount left in the first card", async () => {
    start("/plan", withBudget);
    const hero = await screen.findByTestId("budget-hero");
    // The hero is the first thing under the header, so it is above the fold.
    const stack = hero.parentElement!;
    expect(stack.firstElementChild).toBe(hero);
    expect(hero.textContent).toContain("£80");
    expect(hero.textContent).toContain("weekly budget");
    expect(screen.getByTestId("budget-hero-left").textContent).toMatch(/^£[\d.]+ (left|over) · 4 days to go$/);
  });

  it("with no budget, Plan shows one Set your first budget card", async () => {
    start("/plan");
    expect(await screen.findByRole("heading", { name: "Set your first budget" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Set your first budget" }));
    const sheet = await screen.findByRole("dialog");
    // Pre-filled from the forecast: one tap on Save confirms it.
    expect(within(sheet).getByLabelText("Amount")).toHaveProperty("value", "100");
    expect(within(sheet).getByText("Based on your money until payday: about £100 a week.")).toBeTruthy();
    expect(within(sheet).getByTestId("edit-preview").textContent).toContain("That's about £14 a day.");
    fireEvent.click(within(sheet).getByRole("button", { name: "Save budget" }));
    expect(await screen.findByText("Budget saved")).toBeTruthy();
    expect((await screen.findByTestId("budget-hero")).textContent).toContain("£100");
  });

  it("editing a budget in Control shows the new amount in Plan and Home at once", async () => {
    start("/control", withBudget);
    fireEvent.click(await screen.findByRole("button", { name: /All spending budget, £80 a week\. Edit/ }));
    const sheet = await screen.findByRole("dialog");
    fireEvent.change(within(sheet).getByLabelText("Amount"), { target: { value: "120" } });
    expect(within(sheet).getByTestId("edit-preview").textContent).toContain("That's about £17 a day.");
    fireEvent.click(within(sheet).getByRole("button", { name: "Save budget" }));
    await closeSheetIfOpen();
    // Toast with Undo.
    expect(await screen.findByText("Budget saved")).toBeTruthy();
    tab("Plan");
    expect((await screen.findByTestId("budget-hero")).textContent).toContain("£120");
    tab("Home");
    expect((await screen.findByTestId("home-budget")).textContent).toContain("£120");
    expect(stored().budgets[0].limit).toBe(120);
  });

  it("Delete budget asks for confirmation in the same sheet", async () => {
    start("/plan", withBudget);
    fireEvent.click(await screen.findByTestId("budget-hero"));
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(sheet).getByRole("button", { name: "Delete budget" }));
    expect(await screen.findByText(/This deletes your £80 weekly budget for all spending/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete budget" }));
    expect(await screen.findByRole("heading", { name: "Set your first budget" })).toBeTruthy();
  });
});

async function closeSheetIfOpen() {
  if (screen.queryByRole("dialog")) await closeSheet();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

describe("smooth editing: no steppers, spinners or native selects", () => {
  const assertNoSteppers = () => {
    expect(document.querySelectorAll('input[type="number"]').length).toBe(0);
    expect(document.querySelectorAll("select").length).toBe(0);
    for (const input of Array.from(document.querySelectorAll("input"))) {
      const mode = input.getAttribute("inputmode");
      if (mode === "decimal" || mode === "numeric") expect(input.type).toBe("text");
    }
  };

  it("on every screen and every edit sheet", async () => {
    start("/home", withBudget);
    await screen.findByTestId("summary-lines");
    assertNoSteppers();

    const sheets: [string, string | RegExp][] = [
      ["Plan", "Add budget"],
      ["Plan", "Add goal"],
      ["Plan", /^Money you have now/],
      ["Plan", /^Next payday/],
      ["Control", "Add a payday"],
      ["Control", /Money until payday in GBP/],
      ["Control", /Base currency GBP\. Change/],
      ["Control", "Add a bank"],
    ];
    for (const [where, name] of sheets) {
      tab(where);
      fireEvent.click((await screen.findAllByRole("button", { name }))[0]);
      await screen.findByRole("dialog");
      assertNoSteppers();
      await closeSheet();
    }
    for (const where of ["Habits", "Ask", "Plan", "Control"]) {
      tab(where);
      assertNoSteppers();
    }
  }, 20_000);

  it("the forecast See why sheet edits the money amount inline and the numbers update live", async () => {
    start("/plan");
    fireEvent.click((await screen.findAllByRole("button", { name: "See why" }))[0]);
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(sheet).getByRole("button", { name: /Edit money you have, £155/ }));
    const input = within(sheet).getByLabelText("Money you have until payday");
    fireEvent.change(input, { target: { value: "200" } });
    // 200 − 171 − 23.99 = 5.01 safe: the headline and the sheet update together.
    await waitFor(() => expect(screen.getByTestId("forecast-headline-GBP").textContent).toBe("£5 safe to spend until Fri 13 Nov"));
    expect(within(sheet).getByText("Safe to spend until Fri 13 Nov")).toBeTruthy();
    fireEvent.blur(input);
    expect(await screen.findByText("Money until payday updated")).toBeTruthy();
    expect(stored().moneyUntilPayday.GBP).toBe(200);
  });
});

describe("banks", () => {
  it("adding Nordlys Bank: appears in Banks and cards, the card breakdown and a NOK line; GBP forecast unchanged", async () => {
    start("/control");
    fireEvent.click(await screen.findByRole("button", { name: "Add a bank" }));
    let sheet = await screen.findByRole("dialog");
    fireEvent.change(within(sheet).getByLabelText("Search banks"), { target: { value: "nord" } });
    expect(within(sheet).queryByText("Harbour Bank")).toBeNull();
    fireEvent.click(within(sheet).getByRole("button", { name: /Nordlys Bank, Norway/ }));
    sheet = await screen.findByRole("dialog");
    const connect = within(sheet).getByRole("button", { name: "Connect 1 card" }) as HTMLButtonElement;
    expect(connect.disabled).toBe(true); // consent first
    fireEvent.click(within(sheet).getByRole("switch", { name: "Consent for Nordlys Bank" }));
    fireEvent.click(connect);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    expect(await screen.findByTestId("bank-Nordlys Bank")).toBeTruthy();
    tab("Home");
    expect(await screen.findByRole("button", { name: /Nordlys Bank, Nordlys Bank, ending 2268/ })).toBeTruthy();
    expect(screen.getByTestId("currency-totals").textContent).toContain("kr");
    expect(screen.getAllByText(/About £40 short before payday, Fri 13 Nov/).length).toBeGreaterThan(0);
    expect(screen.getByText("Add a payday in NOK to get a forecast")).toBeTruthy();
  });

  it("removing Riverside: confirm step, leaves all totals, and can be added back with its history", async () => {
    start("/home");
    const before = (await screen.findByTestId("currency-totals")).textContent;
    tab("Control");
    const riverside = await screen.findByTestId("bank-Riverside");
    fireEvent.click(within(riverside).getByRole("button", { name: "Remove bank" }));
    const sheet = await screen.findByRole("dialog");
    expect(
      within(sheet).getByText(
        "This removes Riverside and its 1 card from Visa One. Your bank cards keep working. Your history is kept so you can add the bank back."
      )
    ).toBeTruthy();
    expect(within(sheet).getByRole("button", { name: "Also delete this bank's data" })).toBeTruthy();
    fireEvent.click(within(sheet).getByRole("button", { name: "Remove Riverside" }));
    await waitFor(() => expect(screen.queryByTestId("bank-Riverside")).toBeNull());

    tab("Home");
    expect(screen.queryByRole("button", { name: /Riverside, Riverside, ending 1307/ })).toBeNull();
    expect(screen.getByTestId("currency-totals").textContent).not.toBe(before);

    tab("Control");
    fireEvent.click(await screen.findByRole("button", { name: "Add a bank" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /^Riverside, United Kingdom/ }));
    const add = await screen.findByRole("dialog");
    expect(within(add).getByText(/history kept/)).toBeTruthy();
    fireEvent.click(within(add).getByRole("switch", { name: "Consent for Riverside" }));
    fireEvent.click(within(add).getByRole("button", { name: "Connect 1 card" }));
    await waitFor(() => expect(screen.getByTestId("bank-Riverside")).toBeTruthy());
    tab("Home");
    expect((await screen.findByTestId("currency-totals")).textContent).toBe(before);
  });

  it("Demo reset (long-press the logo) returns the three seed banks and the original numbers", async () => {
    start("/control", (s) => ({ ...s, cards: s.cards.map((c) => (c.bank === "Riverside" ? { ...c, connected: false } : c)) }));
    const logo = (await screen.findAllByRole("img", { name: "Visa One" }))[0];
    fireEvent.pointerDown(logo);
    await new Promise((r) => setTimeout(r, 900));
    fireEvent.pointerUp(logo);
    await waitFor(() => expect(document.querySelector("[data-step=S0]")).toBeTruthy());
    const s = stored();
    expect(s.onboarded).toBe(false);
    expect(s.cards.filter((c) => c.connected).map((c) => c.bank)).toEqual(["Northbank", "Riverside", "Banco Solano"]);
    expect(s.moneyUntilPayday).toEqual({ GBP: 155, EUR: 60 });
  });
});
