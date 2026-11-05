# Visa One: design (change request 2)

## Constraints and how they are met

| Constraint | Approach |
| --- | --- |
| `forecastRules.ts` unchanged, R1 numbers from rules | New plan numbers (budget suggestion, amount left, per-day preview) live in `src/domain/planRules.ts`. Every function there only does simple, visible arithmetic on results from `forecastRules.ts`. |
| Budget "left" and "days to go" | Budgets use calendar periods: weeks run Monday to Sunday, months from the 1st, years from 1 Jan, all from `DEMO_TODAY` (`dates.periodStartISO`, `dates.periodDaysLeft`). `planRules.budgetSpent` sums payments from the period start, using the same card filter as totals (`forecastRules.totalsTx`). The old `forecastRules.budgetProgress` (a rolling 7 / 30 / 365-day window) stays in the file unchanged but is no longer used for budgets: it counted last week's payments, so a brand-new weekly budget started "£46.76 over". Demo: Wed 4 Nov, weekly budget counts Mon 2 to Wed 4 Nov (£30.24) and has 4 days to go. |
| Seed data unchanged | New banks and their demo transactions live in `src/data/banks.ts`, generated deterministically from `DEMO_TODAY`. They only enter state when the user adds a bank. |
| `fxRates.ts` existing rates | Add NOK only: 1 NOK = 0.072 GBP, GBP to NOK derived as 1 / 0.072. |
| R4 rewards hidden when short | Unchanged. The daily-spend slider in Plan is a what-if and is never saved, so stored state and `anyForecastShort` always agree. |

## Sassy text pipeline

`textWriter.ts` builds the Sassy line from a template, then runs `guardSassy(sassy, calm)`:
`checkSassy` (advice words, person-shaming, income/body/looks, swear words except "what
the hell", spending pushes) and an emoji count of 1 to 3. If the check fails, the calm
Personal line is used. Professional and Personal never contain emoji (tested).

Shortfall messages carry a `shortfall` flag so the UI can add "Too much? Switch to
Personal" (`ui/ToneSwitch.tsx`).

## Editing components (`src/ui/`)

- `AmountField` (large, sheet) and `AmountInput` (inline): `type="text"` with
  `inputMode="decimal"`, so phones show the number keypad and no spinners exist.
- `Segmented`: radio-group segmented control for periods, currencies, frequencies.
- `Slider`: styled `input type="range"` for what-if ranges.
- `DatePicker`: month calendar inside a sheet; dates before `DEMO_TODAY` disabled.
- `EditSheet`: wraps `Sheet` with title, content, a live preview box, Save, Cancel and an
  optional Delete with a confirm step.
- `useUndoableSave` (`ui/undo.ts`): snapshots the state keys an edit touches, applies the
  edit, shows a toast with Undo that restores the snapshot.

## Banks

`BANKS` catalogue: id, name, country, currency, tile gradient, initials, cards. A bank is
"in Visa One" when at least one of its cards is connected. Store helpers:

- `addBank(state, bankId, cardIds)`: reconnects known cards (history kept) or adds new
  cards with their demo transactions.
- `removeBank(state, bankName)`: disconnects every card of the bank (history kept).
- `deleteBankData(state, bankName)`: removes the bank's cards, transactions and renewals.

## Screens

- Plan: budget hero (or "Set your first budget"), compact budgets and goals, forecast
  detail (money and payday open edit sheets; daily-spend what-if slider), tips, rewards.
- Home: adds a main-budget card under the summary.
- Control: promise, Budgets and goals, Banks and cards, sharing, paydays and money until
  payday, base currency, tone, Not my pattern, your data.
- S10: "Set a budget" and "Later".
