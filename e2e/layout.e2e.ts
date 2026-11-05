// layout.e2e.ts — real-browser checks at 390 x 844 (change request section 5):
//   WHEN any screen is shown THEN nothing scrolls sideways AND text meets WCAG AA.
// Runs the dev server and the locally installed Google Chrome through playwright-core,
// with axe-core for accessibility. Screenshots go to e2e/screenshots/ for review.
// Run: npm run test:e2e   (set CHROME_PATH if Chrome is somewhere else)

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import { chromium, type Browser, type Page } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const shots = resolve(here, "screenshots");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

let server: ViteDevServer;
let browser: Browser;
let page: Page;
const findings: { screen: string; sideways: string[]; axe: string[]; steppers: number }[] = [];

async function settle() {
  await page.waitForTimeout(450);
}

async function check(screen: string, opts: { scrollShots?: boolean } = {}) {
  await settle();
  const sideways = await page.evaluate(() => {
    const vw = window.innerWidth;
    const out: string[] = [];
    if (document.documentElement.scrollWidth > vw) out.push(`document scrollWidth ${document.documentElement.scrollWidth}`);
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (getComputedStyle(el).position === "absolute" && el.classList.contains("sr-only")) continue;
      if (r.right > vw + 0.5 || r.left < -0.5) {
        out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} [${Math.round(r.left)}, ${Math.round(r.right)}]`);
      }
      const cs = getComputedStyle(el);
      if (["auto", "scroll"].includes(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) {
        out.push(`scrolls sideways: ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
      }
    }
    return out.slice(0, 10);
  });
  await page.addScriptTag({ content: axeSource });
  const axe = await page.evaluate(async () => {
    // @ts-expect-error axe is injected above
    const res = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
    return res.violations.map(
      (v: { id: string; nodes: { target: string[] }[] }) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`
    );
  });
  // No arrow steppers, number spinners or native selects anywhere (change request 2).
  const steppers = await page.evaluate(() => document.querySelectorAll('input[type="number"], select').length);
  findings.push({ screen, sideways, axe, steppers });
  await page.screenshot({ path: resolve(shots, `${screen}.png`) });
  if (opts.scrollShots) {
    const height = await page.evaluate(() => document.querySelector("[data-scroll=main]")?.scrollHeight ?? 0);
    for (let y = 700, i = 2; y < height; y += 700, i++) {
      await page.evaluate((top) => document.querySelector("[data-scroll=main]")?.scrollTo(0, top), y);
      await page.waitForTimeout(150);
      await page.screenshot({ path: resolve(shots, `${screen}-${i}.png`) });
    }
    await page.evaluate(() => document.querySelector("[data-scroll=main]")?.scrollTo(0, 0));
  }
}

async function primary() {
  await page.locator("[data-slot=primary-action] button").click();
}

async function closeSheet() {
  await page.keyboard.press("Escape");
  await page.waitForSelector("[data-sheet=bottom]", { state: "detached" });
}

describe.skipIf(!existsSync(CHROME))("layout and contrast at 390 x 844", () => {
  beforeAll(async () => {
    mkdirSync(shots, { recursive: true });
    server = await createServer({ root, logLevel: "error", server: { port: 5199 } });
    await server.listen();
    browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
    });
    page = await context.newPage();
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
    await server?.close();
    console.table(findings.map((f) => ({ screen: f.screen, sideways: f.sideways.length, axe: f.axe.length, steppers: f.steppers })));
    for (const f of findings) {
      if (f.sideways.length || f.axe.length) console.log(f.screen, f.sideways, f.axe);
    }
  });

  it("first use S0 to S10 and every main screen", async () => {
    const url = server.resolvedUrls!.local[0];
    await page.goto(url);
    await page.waitForSelector("[data-step=S0]");
    await page.screenshot({ path: resolve(shots, "S0.png") });
    await page.waitForSelector("[data-step=S1]", { timeout: 5000 });
    await check("S1");
    await page.getByRole("button", { name: "Activate Visa One" }).click();
    await page.waitForSelector("[data-step=S2]");
    await check("S2");
    await page.getByRole("button", { name: "Get started" }).click();

    await page.waitForSelector("[data-step=S3]");
    await page.getByLabel("Email or phone").fill("sam@example.com");
    await page.getByLabel("One-time code").fill("123456");
    await page.getByRole("switch", { name: "I'm 18 or over" }).click();
    await check("S3");
    await primary();
    for (const s of ["S4", "S5", "S6", "S7", "S8"]) {
      await page.waitForSelector(`[data-step=${s}]`);
      await check(s);
      if (s === "S7") {
        await page.getByRole("button", { name: "Add a payday" }).click();
        await page.waitForSelector("[data-sheet=bottom]");
        await check("S7-add-payday-sheet");
        await closeSheet();
      }
      await primary();
    }
    await page.waitForSelector("[data-step=S9]");
    await page.screenshot({ path: resolve(shots, "S9.png") });
    await page.waitForSelector("[data-step=S10]", { timeout: 5000 });
    await check("S10");
    expect(await page.getByTestId("first-insight").textContent()).toContain(
      "about £40 short before your payday on Fri 13 Nov"
    );
    await page.getByRole("button", { name: "See why" }).click();
    await page.waitForSelector("[data-sheet=bottom]");
    await check("S10-why-sheet");
    await closeSheet();
    // S10 → "Set a budget": the sheet is pre-filled from the forecast, one tap confirms.
    await page.getByRole("button", { name: "Set a budget" }).click();
    await page.waitForSelector("[data-sheet=bottom]");
    await check("S10-budget-sheet");
    await page.getByRole("button", { name: "Save budget" }).click();

    await page.waitForSelector("[data-scroll=main]");
    await check("home", { scrollShots: true });
    await page.getByRole("button", { name: /Northbank, Northbank, ending 4821/ }).click();
    await page.waitForSelector("[data-sheet=bottom]");
    await check("home-card-sheet");
    await closeSheet();

    for (const tab of ["Habits", "Plan", "Ask", "Control"]) {
      await page.getByRole("link", { name: tab }).click();
      await page.waitForTimeout(200);
      if (tab === "Ask") {
        await page.getByRole("button", { name: "Why am I short this month?" }).click();
        await page.getByRole("button", { name: "How we worked this out" }).click();
      }
      await check(tab.toLowerCase(), { scrollShots: true });
      if (tab === "Plan") {
        // WHEN the user opens Plan THEN the main budget and amount left are visible without scrolling.
        const hero = (await page.getByTestId("budget-hero").boundingBox())!;
        const tabBarTop = 844 - 12 - 64;
        expect(hero.y, "budget hero starts on screen").toBeGreaterThanOrEqual(0);
        expect(hero.y + hero.height, "budget hero ends above the tab bar").toBeLessThanOrEqual(tabBarTop);
        await page.getByTestId("budget-hero").click();
        await page.waitForSelector("[data-sheet=bottom]");
        await check("plan-budget-sheet");
        await closeSheet();
      }
      if (tab === "Control") {
        await page.getByRole("button", { name: "Add a bank" }).click();
        await page.getByLabel("Search banks").fill("nord");
        await page.getByRole("button", { name: /Nordlys Bank, Norway/ }).click();
        await page.getByRole("switch", { name: "Consent for Nordlys Bank" }).click();
        await check("control-add-bank-sheet");
        await page.getByRole("button", { name: "Connect 1 card" }).click();
        await page.waitForSelector("[data-sheet=bottom]", { state: "detached" });
        await page.getByTestId("bank-Nordlys Bank").scrollIntoViewIfNeeded();
        await check("control-banks");
        await page.getByRole("radio", { name: /^Sassy/ }).click();
        await page.getByRole("link", { name: "Home" }).click();
        await check("home-sassy-nok", { scrollShots: true });
        await page.getByRole("link", { name: "Control" }).click();
      }
      if (tab === "Habits") {
        await page.getByRole("button", { name: /GlowRoom/ }).click();
        await page.waitForSelector("[data-sheet=bottom]");
        await check("habits-payment-sheet");
        await closeSheet();
      }
    }

    // Hidden Demo reset: long-press the logo in Control returns to the splash (S0).
    const logo = page.getByRole("img", { name: "Visa One" }).first();
    await page.evaluate(() => document.querySelector("[data-scroll=main]")?.scrollTo(0, 0));
    const box = (await logo.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(900);
    await page.mouse.up();
    await page.waitForSelector("[data-step=S0]", { timeout: 3000 });

    const sideways = findings.filter((f) => f.sideways.length).map((f) => `${f.screen}: ${f.sideways.join("; ")}`);
    const axe = findings.filter((f) => f.axe.length).map((f) => `${f.screen}: ${f.axe.join("; ")}`);
    expect(sideways, "nothing scrolls sideways").toEqual([]);
    expect(findings.filter((f) => f.steppers > 0).map((f) => f.screen), "no number spinners or selects").toEqual([]);
    expect(axe, "WCAG AA (axe-core)").toEqual([]);
  }, 120_000);
});
