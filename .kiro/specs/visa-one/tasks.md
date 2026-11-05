# Visa One: tasks (change request 2)

- [x] 1. Domain
  - [x] 1.1 Add NOK to `config.ts` and `fxRates.ts` (demo rate 1 NOK = 0.072 GBP); new countries NO, FR, US
  - [x] 1.2 `guardrails.ts`: `checkSassy`, emoji counting
  - [x] 1.3 `textWriter.ts`: new R5, Sassy templates (summary, habits, renewals, on track, budget, goals, toasts), "Gurlllll" preview
  - [x] 1.4 `askEngine.ts`: Sassy answers with shortfall flag
  - [x] 1.5 `planRules.ts`: calendar-period budget spending, budget suggestion, amount left, per-day preview, main budget; `dates.periodStartISO`, `dates.periodDaysLeft`
  - [x] 1.6 `data/banks.ts`: six fictional banks, demo cards and transactions; store helpers addBank, removeBank, deleteBankData, saveBudget, saveGoal, savePayday
- [x] 2. Editing components: AmountField, AmountInput, Segmented, Slider, DatePicker, EditSheet, undoable save; remove SelectField and number inputs
- [x] 3. Sheets: budget (create, edit, delete confirm), goal, payday (calendar), money until payday, base currency, card rename, add bank, remove bank
- [x] 4. Screens
  - [x] 4.1 Plan: budget hero, first-budget card, compact cards, forecast edits
  - [x] 4.2 Home: budget card, "See why" labels, Switch to Personal
  - [x] 4.3 Control: Budgets and goals, Banks and cards, edit rows
  - [x] 4.4 Onboarding: S7 amount inputs, S10 "Set a budget" / "Later"
  - [x] 4.5 Ask: Sassy answers, Switch to Personal
- [x] 5. Docs: steering file (emoji exception, editing pattern), README (R5)
- [x] 6. Tests: change request 2 section 6; update the v3 R5 test for the new rule; run all tests and the browser check
