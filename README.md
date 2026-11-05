# Visa One — student concept prototype

**All your cards, one view, powered by Visa.** A mobile-first web app prototype by
Group K (LSE MG481 Sprint Week). Visa One is an app, not a card.

> Student concept. Not an official Visa product.

## Run it

```bash
npm install
npm run dev      # open http://localhost:5173 — looks best sized to 390 × 844
```

```bash
npm run build      # typecheck + production build
npm run test       # v3 acceptance + guardrails + redesign checks (jsdom)
npm run test:e2e   # real Chrome at 390 × 844: no sideways scroll, axe-core WCAG AA,
                   # screenshots of every step and tab in e2e/screenshots/
npm run test:all   # both
```

`test:e2e` uses the Google Chrome already installed on the machine (set
`CHROME_PATH` if it lives elsewhere). It is skipped if Chrome is not found.

**Demo reset:** long-press the Visa One logo on the Control screen. It returns
the app to the splash screen with the seed data.

No backend, no network needed. State lives in the browser (localStorage) and is
seeded from `src/data/seed.json`.

## How it's built

- **React + TypeScript + Vite + Tailwind.** Mobile-first, framed at 390 × 844.
- **Demo clock.** The app's "today" is fixed at Wed 4 Nov 2026 (`DEMO_TODAY` in
  `src/domain/config.ts`). The real system date is never used for calculations.
- **Numbers vs words are separated:**
  - `src/domain/forecastRules.ts` — the only place numbers come from (R1).
  - `src/domain/textWriter.ts` — the only place AI words come from. Two modes:
    Mode 1 (default, offline templates per tone) and Mode 2 (optional LLM, then
    run through guardrails). The app works fully in Mode 1 with no network.
  - `src/domain/guardrails.ts` — blocks advice/shaming words and merchant names in
    tips (section 7, R2/R5/R11).
  - `src/domain/fxRates.ts` — fixed demo rates, used only for the dashboard's
    approximate base-currency total (R12), always marked "≈".

## Design system

The rules live in `.kiro/steering/design.md` (always included for Kiro). Tokens
are in `src/ui/tokens.ts` and feed `tailwind.config.ts`, which replaces Tailwind's
default colours and type scale so only theme tokens can be used. Shared
components are in `src/ui/` (Button, Card, Sheet, ListRow, Chip, Toggle, Ring,
ProgressBar, TabBar, Toast, Money, Brand). Motion presets, including the
reduced-motion fades, are in `src/ui/motion.ts`. Inter is self-hosted through
`@fontsource/inter`.

## Screens

First use S0 to S10: splash, Northbank bank benefit, welcome, then six framed steps
(account, your data, cards, what it can see, paydays, voice), building your view,
and the first insight. Then the tab bar: **Home · Habits · Plan · Ask · Control**.
The flow diagram is in `docs/visa-one-app-flow.png`.

## Seed data (fictional)

- Northbank Visa debit, UK, GBP, •••• 4821
- Riverside Visa credit, UK, GBP, •••• 1307
- Banco Solano Visa debit, Spain, EUR, •••• 5590

~60 days of transactions to the demo date, tuned so usual daily spend ≈ £19 / €1.
Regenerate with `node scripts/generateSeed.mjs`.

Key demo numbers:
- GBP forecast: £155 − (£19 × 9 days) − £12.99 − £11.00 ≈ **£40 short** before Fri 13 Nov.
- EUR forecast: €60 − (€1 × 27 days) − €9.99 = **€23.01 safe** to Tue 1 Dec.

## Product rules

Enforced in code and covered by tests: numbers from rules only (R1), guidance not
advice (R2/R3), rewards hidden when short (R4), tone changes words only (R5, see below),
"Not my pattern" counts in totals but not habits (R6), opt-in labelled rewards from
weekly/monthly/yearly goals only (R7), a working "why" on every insight (R8),
currencies never converted except the "≈" base total (R12), demo clock everywhere (R13).

**R5, as changed by change request 2.** Professional and Personal turn calm and kind
when the user is short. Sassy stays sassy when short, because the user chose it:
playful tough love about the spending, never the person. Sassy may use slang and 1 to
3 emojis; it never comments on income, body, looks or worth, never swears ("what the
hell" is the limit), never uses fear or fake urgency, and never pushes spending. Every
Sassy shortfall message states the amount and payday, has "See why", and offers
"Too much? Switch to Personal". Each Sassy line passes `checkSassy` in
`src/domain/guardrails.ts` or falls back to the calm line.

## Change request 2

Spec: `.kiro/specs/visa-one/` (requirements, design, tasks).

- **Budgets:** Plan opens with the main budget (navy hero). Budgets count the current
  calendar period (weeks start Monday) in `src/domain/planRules.ts`; the budget sheet
  suggests an amount from the forecast. Edit budgets and goals from Plan or Control.
- **Editing:** amount fields with the number keypad, presets, segmented controls, a
  calendar for paydays, a what-if slider for daily spend, and Save with Undo.
- **Banks:** Control → Banks and cards → Add a bank (six fictional banks, including
  Nordlys Bank in NOK at the demo rate 1 NOK = 0.072 GBP) or Remove bank.
