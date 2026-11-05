// diagnose.mjs — drive the app like a user, animations ON, in WebKit (Safari engine) and
// Chrome, at desktop and phone sizes. Reports layout drift, stuck overlays, hangs, errors.
// Run with the dev server up: node e2e/diagnose.mjs

import { chromium, webkit } from "playwright-core";
import { mkdirSync } from "node:fs";

const URL = "http://localhost:5173/";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
mkdirSync("e2e/diag", { recursive: true });

const problems = [];

async function probe(page, label) {
  const r = await page.evaluate(() => {
    const frame = document.querySelector("[data-frame=phone]");
    const nav = document.querySelector("nav[aria-label=Main]");
    const fr = frame?.getBoundingClientRect();
    const overlay = frame?.lastElementChild;
    // Anything inside the overlay layer that still catches taps.
    const blockers = overlay
      ? Array.from(overlay.querySelectorAll("*")).filter((el) => {
          const cs = getComputedStyle(el);
          const b = el.getBoundingClientRect();
          return cs.pointerEvents !== "none" && b.width > 50 && b.height > 50 && cs.visibility !== "hidden";
        }).length
      : 0;
    return {
      frameScrollTop: frame ? Math.round(frame.scrollTop) : null,
      docScrollY: Math.round(window.scrollY),
      // Measure from the inside of the frame (the desktop bezel is a 10 px border).
      navGap: nav && fr ? Math.round(fr.bottom - parseFloat(getComputedStyle(frame).borderBottomWidth) - nav.getBoundingClientRect().bottom) : null,
      dialogs: document.querySelectorAll("[role=dialog]").length,
      blockers,
      steps: Array.from(document.querySelectorAll("[data-step]")).map((e) => e.getAttribute("data-step")),
    };
  });
  return { label, ...r };
}

function check(p, ctx, expect) {
  const issues = [];
  if (p.frameScrollTop) issues.push(`phone frame scrolled by ${p.frameScrollTop}px`);
  if (p.docScrollY) issues.push(`page scrolled by ${p.docScrollY}px`);
  if (p.navGap !== null && Math.abs(p.navGap - 12) > 2) issues.push(`tab bar ${p.navGap}px from frame bottom (want 12)`);
  if (expect?.dialogs !== undefined && p.dialogs !== expect.dialogs) issues.push(`dialogs open: ${p.dialogs} (want ${expect.dialogs})`);
  if (expect?.blockers === 0 && p.blockers) issues.push(`${p.blockers} invisible overlay element(s) still catching taps`);
  if (issues.length) problems.push(`[${ctx}] ${p.label}: ${issues.join("; ")}`);
  return issues;
}

async function timed(fn, ms = 4000) {
  const t = Date.now();
  try {
    await fn();
    return Date.now() - t;
  } catch (e) {
    return `TIMEOUT/ERROR after ${Date.now() - t}ms: ${String(e.message).split("\n")[0]}`;
  }
}

async function run(engine, name, viewport) {
  const ctx = `${name} ${viewport.width}x${viewport.height}`;
  const browser = await engine.launch(engine === chromium ? { executablePath: CHROME, headless: true } : { headless: true });
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL);

  // First use with animations on.
  const flow = [];
  const step = async (id, action) => {
    console.log(`  ${ctx} → ${id}`);
    const t = await timed(() => page.waitForSelector(`[data-step=${id}]`, { timeout: 5000 }));
    flow.push(`${id}:${t}`);
    if (typeof t === "string") problems.push(`[${ctx}] first use stuck before ${id}: ${t}`);
    if (action) await action();
  };
  await step("S1", () => page.getByRole("button", { name: "Activate Visa One" }).click());
  await step("S2", () => page.getByRole("button", { name: "Get started" }).click());
  await step("S3", async () => {
    await page.getByLabel("Email or phone").fill("sam@example.com");
    await page.getByLabel("One-time code").fill("123456");
    await page.getByRole("switch", { name: "I'm 18 or over" }).click();
    await page.locator("[data-slot=primary-action] button").click();
  });
  for (const s of ["S4", "S5", "S6", "S7", "S8"]) {
    await step(s, async () => {
      check(await probe(page, s), ctx, { blockers: 0 });
      await page.locator("[data-slot=primary-action] button").click();
    });
  }
  await step("S10", async () => {
    await page.getByRole("button", { name: "See why" }).click();
    await page.waitForTimeout(700);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
    check(await probe(page, "S10 after why sheet"), ctx, { dialogs: 0, blockers: 0 });
    await page.getByRole("button", { name: "Later" }).click();
  });
  const t = await timed(() => page.waitForSelector("[data-scroll=main]", { timeout: 5000 }));
  flow.push(`Home:${t}`);
  await page.waitForTimeout(900);
  check(await probe(page, "Home"), ctx, { dialogs: 0, blockers: 0 });

  // Open and close sheets on every tab, with taps on the backdrop and Escape.
  const sheetCases = [
    ["Home", () => page.getByRole("button", { name: "See why" }).first()],
    ["Home", () => page.getByRole("button", { name: /Northbank, Northbank, ending 4821/ })],
    ["Habits", () => page.getByRole("button", { name: /GlowRoom/ })],
    ["Plan", () => page.getByRole("button", { name: "Set your first budget" })],
    ["Plan", () => page.getByRole("button", { name: /^Next payday/ }).first()],
    ["Control", () => page.getByRole("button", { name: "Add a bank" })],
    ["Control", () => page.getByRole("button", { name: "Add a payday" })],
  ];
  let i = 0;
  for (const [tab, target] of sheetCases) {
    console.log(`  ${ctx} sheet ${i} on ${tab}`);
    page.setDefaultTimeout(5000);
    await page.getByRole("link", { name: tab }).click();
    await page.waitForTimeout(400);
    const el = target();
    await el.scrollIntoViewIfNeeded().catch(() => {});
    const openT = await timed(async () => {
      await el.click({ timeout: 3000 });
      await page.waitForSelector("[role=dialog]", { timeout: 3000 });
    });
    await page.waitForTimeout(600);
    check(await probe(page, `${tab} sheet ${i} open (${openT}ms)`), ctx, { dialogs: 1 });
    if (typeof openT === "string") problems.push(`[${ctx}] ${tab} sheet ${i} did not open: ${openT}`);
    // Alternate closing styles: backdrop tap, Escape, close button.
    const how = i % 3;
    if (how === 0) {
      // Tap the dimmed backdrop just inside the top of the phone frame.
      const fr = await page.locator("[data-frame=phone]").boundingBox();
      await page.mouse.click(fr.x + fr.width / 2, fr.y + 40);
    }
    else if (how === 1) await page.keyboard.press("Escape");
    else await page.getByRole("button", { name: "Close" }).last().click().catch(() => page.keyboard.press("Escape"));
    const closeT = await timed(() => page.waitForSelector("[role=dialog]", { state: "detached", timeout: 3000 }));
    await page.waitForTimeout(300);
    const p = await probe(page, `${tab} sheet ${i} closed via ${["backdrop", "escape", "close"][how]} (${closeT}ms)`);
    check(p, ctx, { dialogs: 0, blockers: 0 });
    if (typeof closeT === "string") problems.push(`[${ctx}] ${tab} sheet ${i} did not close: ${closeT}`);
    await page.screenshot({ path: `e2e/diag/${name}-${viewport.width}-${i}.png` });
    i++;
  }

  // Rapid tab switching (hang check).
  const rapid = await timed(async () => {
    for (let k = 0; k < 3; k++) for (const tab of ["Home", "Habits", "Plan", "Ask", "Control"]) await page.getByRole("link", { name: tab }).click({ timeout: 2000 });
  }, 20000);
  if (typeof rapid === "string") problems.push(`[${ctx}] rapid tab switching: ${rapid}`);
  await page.waitForTimeout(500);
  check(await probe(page, "after rapid tabs"), ctx, { dialogs: 0, blockers: 0 });

  // Scroll a long screen, then switch tab: does the frame stay put?
  await page.getByRole("link", { name: "Habits" }).click();
  await page.waitForTimeout(400);
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(400);
  check(await probe(page, "Habits scrolled"), ctx, {});
  await page.screenshot({ path: `e2e/diag/${name}-${viewport.width}-habits-scrolled.png` });

  console.log(`\n=== ${ctx}\nflow ms: ${flow.join("  ")}\nrapid tabs: ${rapid}ms`);
  if (errors.length) {
    console.log("errors:", [...new Set(errors)].slice(0, 10));
    problems.push(`[${ctx}] ${new Set(errors).size} console/page error(s)`);
  }
  await browser.close();
}

const only = process.argv[2]; // "webkit" or "chrome"
const sizes = process.argv[3] === "phone" ? [{ width: 390, height: 844 }] : process.argv[3] === "desktop" ? [{ width: 1280, height: 900 }] : [{ width: 1280, height: 900 }, { width: 390, height: 844 }];
for (const [engine, name] of [
  [webkit, "webkit"],
  [chromium, "chrome"],
].filter(([, n]) => !only || n === only)) {
  for (const viewport of sizes) {
    try {
      await run(engine, name, viewport);
    } catch (e) {
      problems.push(`[${name} ${viewport.width}] crashed: ${String(e.message).split("\n")[0]}`);
    }
  }
}
console.log(`\n=== ${problems.length} problem(s)`);
for (const p of problems) console.log(" -", p);
