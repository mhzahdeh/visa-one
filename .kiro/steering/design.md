---
inclusion: always
---

# Visa One design system and app flow

Goal: it must look like a real app Visa could launch for Gen Z. Corporate Visa identity, with a modern, cool finish. Professional above all.

Do not change `forecastRules.ts`, `fxRates.ts`, the seed data, `DEMO_TODAY` or any number. Product rules R1 to R13 and all acceptance tests must keep passing. Tokens live in `src/ui/tokens.ts` and feed `tailwind.config.ts`; never hard-code colours or fonts outside the theme. Use the shared components in `src/ui/` on every screen.

## 2. Design system

### 2.1 Brand assets
- `public/brand/VisaOne_logo_transparent.png`: blue VISA with gold "one", for light backgrounds.
- `public/brand/VisaOne_logo_on-dark.png`: white VISA with gold "one", for navy backgrounds.
- Logo sizes: 40 px high on the splash and welcome screens; 20 px high in the Home header. Never stretch it, recolour it, add effects or place it on a busy background. Keep clear space around it at least the height of the "one".
- App icon and favicon: the gold "one" on a navy square with 22 percent rounded corners.

### 2.2 Colour tokens (Tailwind theme)
- visa-blue #1434CB: primary buttons, links, active tab, focus rings.
- visa-navy #0B1048: hero card, splash, onboarding background, headings on light.
- navy-800 #141B5C, navy-700 #1F2A78: gradients and pressed states.
- visa-gold #F6B700: brand accent only (the "one", the progress bar fill, partner reward badge). Never for warnings.
- ink #0B1030 (main text), slate #5B6178 (secondary text), line #E6E8F0 (dividers), surface #FFFFFF (cards), canvas #F5F6FA (app background).
- status-ok #0F9D6E with a check icon. status-heads-up #D9730D with an info-triangle icon (calm amber, used for "short"). Never pure red, except the Delete text button.
- Hero gradient: linear 160deg from #0B1048 to #1A2A8C, plus a soft radial glow of #1434CB at 35 percent opacity in the top right corner.
- Bank card tiles: each issuer gets its own two-tone gradient (Northbank deep green, Riverside teal, Banco Solano burgundy), with "•• 4821", bank name, a small country flag and currency code.
- Implementation note: status colours fail AA as small text on white, so text on light backgrounds uses the darker `ok-ink` / `headsup-ink` tokens; the base status colours are for icons, arcs and text on navy.

### 2.3 Typography
- Font: Inter, self-hosted through @fontsource/inter (weights 400, 500, 600, 700) so it works offline. Fallback: system-ui, -apple-system, "Segoe UI", sans-serif.
- Scale: display 40/44 bold, letter-spacing -0.02em (hero amounts); title 28/34 semibold (screen titles); heading 20/26 semibold; body 16/24 regular; label 14/20 medium; caption 12/16 medium, slate.
- All money uses tabular figures (font-variant-numeric: tabular-nums). Currency symbol at 60 percent of the number's size, top-aligned, like a premium banking app.
- Sentence case everywhere. No ALL CAPS except tiny labels (caption, letter-spacing 0.06em). No exclamation marks except the met-goal moment.

### 2.4 Layout and components
- 4 px spacing grid. Screen gutter 20 px. Card padding 20 px. Gap between cards 12 px.
- Radius: cards 20 px, buttons 14 px, inputs 12 px, chips and toggles fully round.
- Elevation: cards use one soft shadow (0 1px 2px rgba(11,16,72,0.04), 0 8px 24px rgba(11,16,72,0.06)). No heavy borders.
- Primary button: full width, 56 px high, visa-blue, white 16 px semibold label, pinned to the bottom safe area on first-use screens. Secondary button: white with a visa-blue label. Text button for "See why", "Undo" and similar actions.
- Header (main screens): logo 20 px left, a small currency chip and a round avatar initial right. Screen title below in 28 px.
- Hero card (Home top): navy gradient, logo-free, holds the forecast ring, the forecast sentence and a "See why" text button in white. The AI summary sits directly under it in a white card with a small sparkle icon labelled "Summary".
- Forecast ring: 160 px, 10 px stroke, rounded caps, amber or green arc on a white 12 percent track, the amount in display type inside, "9 days to payday" caption below.
- Lists: 64 px rows, 40 px leading icon or card tile, title and caption left, amount right in tabular figures.
- Bottom tab bar: floating 12 px above the bottom, 64 px high, white at 85 percent with backdrop blur, 24 px radius, soft shadow. Five lucide-react icons (Home, ChartNoAxesColumn, Target, MessageCircle, ShieldCheck) with 11 px labels. The active tab gets a visa-blue icon and a small pill behind it.
- Bottom sheets: all "See why", card actions, add payday, add budget or goal, Not my pattern and confirmations open as bottom sheets (24 px top radius, grab handle, dimmed background). Never full-page modals.
- Icons: lucide-react only, 1.75 stroke, 20 or 24 px. No emoji in the interface. The only exception (change request 2): Sassy AI text (summary, insights, budget and goal lines, Ask answers, toasts) may contain 1 to 3 emojis. Never as interface icons; never in Professional or Personal text.
- Editing (change request 2): no number inputs, spinners, arrow steppers or native selects. Amounts use `AmountField` / `AmountInput` (text input, `inputMode="decimal"`, number keypad) with preset chips; choices use `Segmented` or `Chip`; ranges use `Slider`; payday dates use `DatePicker` inside a sheet. Every edit uses `EditSheet`: title, fields, live preview, one primary Save, a quiet Cancel, optional Delete with confirm, and a toast with Undo (`useUndoableSave`).
- Sassy shortfall messages always show the "Too much? Switch to Personal" text button (`ToneSwitch`).
- Empty and loading states: skeleton blocks in line colour with a slow shimmer; never spinners on main screens.
- Toasts: a small navy pill at the top for "Card removed. Undo", "Marked as Not my pattern. Undo".

### 2.5 Motion (framer-motion)
- First-use steps slide left or right, 280 ms, ease out. The progress bar fills in gold.
- "Building your view": three short lines tick in one by one ("Reading 3 Visa cards", "Sorting 2 currencies", "Checking your paydays"), 1.5 s total.
- Hero reveal: the ring draws from 0 to its value in 800 ms, and the amount counts up at the same time. A light haptic-style scale (0.98 to 1) on the card.
- Bottom sheets spring up (stiffness 300, damping 30). Tab changes cross-fade in 150 ms.
- Respect prefers-reduced-motion: replace all of this with 150 ms fades. All presets live in `src/ui/motion.ts`.

### 2.6 Voice in the interface
- Short, direct, warm. Title states the point; caption explains in one line.
- Example step title: "Which cards should Visa One see?" Caption: "Only Visa cards. You can change this any time."

## 3. App flow

First use, under 60 seconds. Steps S3 to S8 show a 6-part progress bar and a back arrow at the top, and one primary button at the bottom.

- S0 Splash: navy, logo on-dark centred, motto below in white 16 px at 70 percent opacity. Auto-continues after 1.2 s.
- S1 Bank benefit: a simple Northbank app screen (not Visa styled) with a "Card benefits" list; the Visa One tile is highlighted. Button: Activate Visa One. No bank login.
- S2 Welcome: navy background, logo, motto, three value lines with icons (All your Visa cards in one view; Know early if money gets tight; You stay in control). Small disclaimer line. Button: Get started.
- S3 Create account (1/6): email or phone, a one-time code (fake: any 6 digits), and an "I'm 18 or over" switch.
- S4 Your data, your choice (2/6): four short promises with check icons (only Visa card payments; no bank balance or other accounts; guidance, not financial advice; switch off or delete any time). Links: Privacy, Terms. Button: Agree and continue.
- S5 Connect cards (3/6): the three card tiles with switches. Caption: "Only Visa cards can be added."
- S6 What it can see (4/6): three switches with "Why we ask" links that open bottom sheets. Rewards off by default.
- S7 Paydays (5/6): the two demo paydays as rows, "Add a payday" opens a bottom sheet, then the "money until your next payday" field per currency.
- S8 Voice (6/6): three selectable cards (Professional, Personal, Sassy) with a live preview line. Default Personal.
- S9 Building your view: the 1.5 s loader from 2.5.
- S10 First insight: navy hero, the ring reveal, "Heads up: at this pace you could be about £40 short before your payday on Fri 13 Nov." Buttons: See why (opens the why sheet), Go to my dashboard.

Main app (tab bar):
- Home: header, hero forecast card, Summary card (3 lines, why links), currency totals with the "≈" base total, "Your cards" list (tap a card for card detail and Manage: rename, include in totals, remove, delete), "Coming up" (next renewals).
- Habits: period chips (Day, Week, Month), category rows with trend arrows, recent payments; tap a payment for a sheet with "Not my pattern".
- Plan: forecast detail per currency with editable assumptions, budgets, goals, and Partner rewards (hidden when short).
- Ask: suggested question chips, chat bubbles, "How we worked this out" expanders, "Ask my bank" handover card.
- Control: data and sharing, cards, paydays, base currency, tone, "Why did I see this?" log, Not my pattern list, download and delete, demo date and hidden Demo reset (long-press the logo).

Keep "Student concept. Not an official Visa product." in small text on the Welcome screen and in Control.
