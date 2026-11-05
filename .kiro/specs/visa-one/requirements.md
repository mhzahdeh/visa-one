# Visa One: requirements (change request 2)

Earlier scope stays in force: the v3 build prompt (product rules R1 to R13, acceptance
checks), and the redesign (steering file `.kiro/steering/design.md`). This document adds
change request 2. Do not change `forecastRules.ts`, the existing rates in `fxRates.ts`,
the seed data, `DEMO_TODAY` or any number. The GBP forecast still shows about £40 short
before Fri 13 Nov.

## Changed product rule

**R5 (replaces v3 R5).** Tone changes words only, never numbers or rules. Professional and
Personal turn calm and kind when the user is short. Sassy stays sassy when short, because
the user chose it: playful tough love, like a Gen Z best friend. Sassy may use emojis and
slang. Sassy never comments on the user's income, body, looks or worth, never uses real
swear words ("what the hell" is the limit), never uses fear or fake urgency, and never
pushes spending. Every Sassy message about being short still states the amount and the
payday and has "See why".

## Requirement 1: Sassy is really sassy

**User story:** As a user who picked Sassy, I want banter like a best friend, so that the
app feels like mine, while the numbers stay true.

1. WHEN the tone is Sassy AND a forecast is short THEN the summary SHALL be sassy, contain 1 to 3 emojis, state the amount ("about £40") and the payday ("Fri 13 Nov"), and show "See why" AND a "Too much? Switch to Personal" text button.
2. WHEN the user taps "Too much? Switch to Personal" THEN the tone SHALL change to Personal AND a toast with Undo SHALL appear.
3. WHEN the tone is Professional or Personal AND a forecast is short THEN the wording SHALL be calm AND contain no emoji.
4. WHEN any Sassy text is generated (summary, insights, budget and goal lines, Ask answers, toasts) THEN it SHALL pass the Sassy guardrail: no advice words, no shaming of the person, nothing about income, body or looks, no real swear words, no pushing to spend. A failing line SHALL fall back to the Personal wording.
5. Emojis SHALL appear only inside Sassy AI text, never as interface icons.
6. The Sassy tone preview in first use and Control SHALL be the "Gurlllll" example.
7. WHEN a forecast is short in any tone THEN no reward or partner offer SHALL be visible (R4 unchanged).

## Requirement 2: Budgets are obvious and seamless

1. WHEN a budget exists THEN Plan SHALL open with a navy "Your budget" hero showing the main budget amount and period in display type, the amount left and the days to go, and a thick progress bar (green under 75 percent, calm amber from 75 percent, never red), all visible without scrolling. Tapping it SHALL open the edit sheet.
2. Other budgets and goals SHALL show below as compact cards with the limit and amount left in large tabular figures.
3. WHEN no budget exists THEN Plan SHALL show one "Set your first budget" card with a primary button.
4. S10 SHALL offer "Set a budget" (primary) and "Later" (text). "Set a budget" SHALL open the budget sheet pre-filled from the forecast so one tap confirms it.
5. The budget sheet (create and edit) SHALL have: a large amount field with the number keypad, preset chips (50, 80, 100, 150), a suggestion line from the forecast, a period segmented control (Day, Week, Month, Year), category chips (All spending, Takeaways, Groceries, Transport, Clothes, Other), a currency segmented control, a live "That's about £11 a day" preview, Save budget, Cancel, and Delete budget with a confirm step.
6. A budget SHALL never change any forecast number.
7. Home SHALL show the main budget so edits are visible there too.

## Requirement 3: Edit budgets and goals at any time in Control

1. Control SHALL have a "Budgets and goals" section near the top listing every budget and goal (name, amount, period, amount left), each opening the same edit sheet, plus "Add budget" and "Add goal" rows.
2. WHEN a budget is edited in Control THEN Plan and Home SHALL show the new amount at once.

## Requirement 4: Smooth editing everywhere

1. The app SHALL contain no number spinners, arrow steppers or native select menus.
2. Amounts SHALL use tappable amount fields with the number keypad; ranges SHALL use sliders (daily spend what-if); choices SHALL use segmented controls or chips; payday dates SHALL use a calendar picker inside a sheet.
3. Edits to budgets, goals, paydays, money until payday, card nicknames and base currency SHALL use one edit-sheet pattern: clear title, live preview, one primary Save, a quiet Cancel, and a toast with Undo after saving.
4. In the forecast "See why" sheet, the money amount and payday date SHALL be editable inline, and the numbers SHALL update live.

## Requirement 5: Add and remove banks

1. Control SHALL show "Banks and cards": each bank as a group with its tile, flag and its Visa cards.
2. "Add a bank" SHALL open a searchable sheet of fictional participating banks (Northbank UK, Riverside UK, Banco Solano ES, Nordlys Bank NO, Banque Lumière FR, Harbour Bank US). Choosing one SHALL show its demo Visa cards with switches and a consent confirmation for that bank. New cards SHALL get a small set of seeded demo transactions.
3. WHEN the user adds Nordlys Bank and connects its card THEN it SHALL appear in Banks and cards, in the card breakdown and as a new NOK currency line AND the GBP forecast SHALL be unchanged.
4. "Remove bank" SHALL, after a confirm sheet, remove the bank and its cards from all totals while keeping history, so it can be added back. "Also delete this bank's data" SHALL be a separate, clearly marked option that erases its transactions.
5. NOK SHALL use the demo rate 1 NOK = 0.072 GBP, labelled as a demo rate.
6. WHEN Demo reset is pressed THEN the app SHALL return to the three seed banks and the original numbers.
