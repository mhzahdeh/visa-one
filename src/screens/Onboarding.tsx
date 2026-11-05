// Onboarding.tsx — first use, S0 to S10 (steering section 3). Under 60 seconds.
// S3 to S8 share one frame: back arrow and 6-part progress bar at the top, one primary
// button pinned at the bottom. Only the content between them slides.

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BellRing,
  Check,
  CircleCheck,
  Layers,
  Plane,
  Plus,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { APP_MOTTO, CURRENCY_SYMBOL, DISCLAIMER, type CurrencyCode, type Tone } from "../domain/config";
import { COUNTRY_SHORT, type Consent, type Payday } from "../domain/types";
import { formatDate } from "../domain/dates";
import { allForecasts, forecastForCurrency } from "../domain/forecastRules";
import { TONE_PREVIEW, approxWhole, forecastSummaryLine, formatAmount } from "../domain/textWriter";
import { useStore } from "../state/store";
import { useMotion } from "../ui/motion";
import { Button, IconButton } from "../ui/Button";
import { Card, Eyebrow } from "../ui/Card";
import { Tag } from "../ui/Chip";
import { AmountInput, TextField } from "../ui/Field";
import { List, ListRow, RowIcon } from "../ui/ListRow";
import { StepProgress, Skeleton } from "../ui/ProgressBar";
import { Ring, ringFraction } from "../ui/Ring";
import { Sheet } from "../ui/Sheet";
import { Toggle } from "../ui/Toggle";
import { CardTile, Flag, Logo } from "../ui/Brand";
import { WhyButton } from "../ui/WhySheet";
import { forecastWhy } from "../ui/whyContent";
import { ICON } from "../ui/icons";
import { PaydaySheet, frequencyLabel } from "../sheets/PaydaySheet";
import { BudgetSheet } from "../sheets/PlanSheets";
import { ToneSwitch } from "../ui/ToneSwitch";

export type StepId = "S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9" | "S10";
export const STEP_ORDER: StepId[] = ["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"];
/** Steps inside the shared frame, and their number out of 6. */
const FRAMED: Partial<Record<StepId, number>> = { S3: 1, S4: 2, S5: 3, S6: 4, S7: 5, S8: 6 };

export const SPLASH_MS = 1200;
export const BUILDING_MS = 1500;

export function isValidContact(v: string): boolean {
  const s = v.trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return true;
  return s.replace(/[\s()+-]/g, "").match(/^\d{7,15}$/) !== null;
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { state, setState } = useStore();
  const m = useMotion();
  const [step, setStep] = useState<StepId>("S0");
  const [dir, setDir] = useState(1);

  // S3 account fields. Kept in memory only: Visa One does not need to store them.
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [adult, setAdult] = useState(false);

  const idx = STEP_ORDER.indexOf(step);
  const go = (to: StepId, d: number) => {
    setDir(d);
    setStep(to);
  };
  const next = () => go(STEP_ORDER[idx + 1], 1);
  const back = () => go(STEP_ORDER[idx - 1], -1);

  // S0 and S9 continue on their own.
  useEffect(() => {
    if (step !== "S0" && step !== "S9") return;
    const t = window.setTimeout(() => go(step === "S0" ? "S1" : "S10", 1), step === "S0" ? SPLASH_MS : BUILDING_MS);
    return () => window.clearTimeout(t);
  }, [step]);

  const finish = () => {
    setState((s) => ({ ...s, activated: true, onboarded: true }));
    onDone();
  };

  const framed = FRAMED[step];
  const primary: Record<string, { label: string; disabled?: boolean }> = {
    S3: { label: "Continue", disabled: !(isValidContact(contact) && /^\d{6}$/.test(code) && adult) },
    S4: { label: "Agree and continue" },
    S5: { label: "Continue", disabled: !state.cards.some((c) => c.connected) },
    S6: { label: "Continue" },
    S7: { label: "Continue" },
    S8: { label: "Continue" },
  };

  const stepMotion = {
    custom: dir,
    variants: m.step,
    initial: "enter",
    animate: "center",
    exit: "exit",
    transition: m.stepTransition,
  };

  return (
    <div className="relative flex h-full flex-col overflow-clip">
      <AnimatePresence mode="wait" initial={false} custom={dir}>
        {framed ? (
          <motion.div key="framed" className="flex h-full flex-col" {...stepMotion}>
            <StepFrame step={framed} onBack={back} primary={primary[step]} onPrimary={next}>
              {/* popLayout: the old step slides out while the new one slides in (one 280 ms move, no blank gap). */}
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.div key={step} data-step={step} {...stepMotion}>
                  {step === "S3" && (
                    <CreateAccount
                      contact={contact}
                      setContact={setContact}
                      code={code}
                      setCode={setCode}
                      adult={adult}
                      setAdult={setAdult}
                    />
                  )}
                  {step === "S4" && <YourData />}
                  {step === "S5" && <ConnectCards />}
                  {step === "S6" && <WhatItCanSee />}
                  {step === "S7" && <Paydays />}
                  {step === "S8" && <Voice />}
                </motion.div>
              </AnimatePresence>
            </StepFrame>
          </motion.div>
        ) : (
          <motion.div key={step} data-step={step} className="flex h-full flex-col" {...stepMotion}>
            {step === "S0" && <Splash />}
            {step === "S1" && <BankBenefit onActivate={next} />}
            {step === "S2" && <Welcome onStart={next} />}
            {step === "S9" && <Building />}
            {step === "S10" && <FirstInsight onDone={finish} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared frame for S3 to S8
// ---------------------------------------------------------------------------

function StepFrame({
  step,
  onBack,
  primary,
  onPrimary,
  children,
}: {
  step: number;
  onBack: () => void;
  primary: { label: string; disabled?: boolean };
  onPrimary: () => void;
  children: ReactNode;
}) {
  return (
    <div data-layout="first-use-step" className="flex h-full flex-col bg-canvas">
      <div className="flex items-center gap-2 px-3 pb-2 pt-4">
        <IconButton label="Back" onClick={onBack}>
          <ArrowLeft size={ICON.md} strokeWidth={ICON.stroke} />
        </IconButton>
        <StepProgress step={step} />
        <span className="tabular w-10 pr-2 text-right text-caption text-slate">{step}/6</span>
      </div>
      <div className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6 pt-4">{children}</div>
      <div data-slot="primary-action" className="px-5 pb-5 pt-3">
        <Button full disabled={primary.disabled} onClick={onPrimary}>
          {primary.label}
        </Button>
      </div>
    </div>
  );
}

function StepIntro({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-title text-visa-navy">{title}</h1>
      <p className="mt-2 text-body text-slate">{caption}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// S0 Splash, S1 Bank benefit, S2 Welcome
// ---------------------------------------------------------------------------

function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-hero px-8 text-center">
      <Logo variant="dark" height={40} />
      <p className="mt-6 text-body text-white/70">{APP_MOTTO}</p>
    </div>
  );
}

function BankBenefit({ onActivate }: { onActivate: () => void }) {
  const others = [
    { icon: Smartphone, title: "Phone wallet payments", caption: "Pay with your phone in shops and apps" },
    { icon: ShieldCheck, title: "Purchase protection", caption: "Cover on eligible card purchases" },
    { icon: Plane, title: "Travel support", caption: "Card help at any hour, abroad too" },
  ];
  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="bg-northbank px-5 pb-6 pt-6 text-white">
        <div className="flex items-center justify-between">
          <span className="text-heading">Northbank</span>
          <span className="text-caption text-white">Visa debit •• 4821</span>
        </div>
        <p className="mt-8 text-title">Card benefits</p>
        <p className="mt-1 text-label font-normal text-white">Included with your Visa card.</p>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="rounded-card bg-surface p-5 shadow-card ring-2 ring-visa-blue">
          <div className="flex items-center justify-between">
            <Logo variant="light" height={20} />
            <Tag>New</Tag>
          </div>
          <p className="mt-4 text-body font-medium text-ink">Your bank, Northbank, includes Visa One with your Visa card.</p>
          <p className="mt-1 text-label font-normal text-slate">All your Visa cards in one view. Run by Visa. No bank login needed.</p>
        </div>
        <Card className="mt-3" padded={false}>
          <div className="px-5">
            <List>
              {others.map((o) => (
                <ListRow key={o.title} leading={<RowIcon icon={o.icon} tone="neutral" />} title={o.title} caption={o.caption} />
              ))}
            </List>
          </div>
        </Card>
      </div>
      <div className="px-5 pb-5 pt-3">
        <Button full variant="bank" onClick={onActivate}>
          Activate Visa One
        </Button>
        <p className="mt-2 text-center text-caption text-slate">No bank login. No banking password.</p>
      </div>
    </div>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  const values = [
    { icon: Layers, text: "All your Visa cards in one view" },
    { icon: BellRing, text: "Know early if money gets tight" },
    { icon: ShieldCheck, text: "You stay in control" },
  ];
  return (
    <div className="flex h-full flex-col bg-hero px-5 text-white">
      <div className="flex flex-1 flex-col justify-center">
        <Logo variant="dark" height={40} />
        <p className="mt-5 text-body text-white/70">{APP_MOTTO}</p>
        <ul className="mt-12 flex flex-col gap-5">
          {values.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Icon size={ICON.md} strokeWidth={ICON.stroke} aria-hidden />
              </span>
              <span className="text-body font-medium">{text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="pb-5 pt-3">
        <Button full onClick={onStart}>
          Get started
        </Button>
        <p className="mt-3 text-center text-caption text-white/70">{DISCLAIMER}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// S3 to S8
// ---------------------------------------------------------------------------

function CreateAccount(p: {
  contact: string;
  setContact: (v: string) => void;
  code: string;
  setCode: (v: string) => void;
  adult: boolean;
  setAdult: (v: boolean) => void;
}) {
  const showCode = isValidContact(p.contact);
  return (
    <div>
      <StepIntro title="Create your account" caption="No bank login. We'll send you a one-time code." />
      <div className="flex flex-col gap-4">
        <TextField
          label="Email or phone"
          autoComplete="email"
          placeholder="you@example.com"
          value={p.contact}
          onChange={(e) => p.setContact(e.target.value)}
        />
        {showCode && (
          <TextField
            label="One-time code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6 digits"
            hint="Demo: any 6 digits works."
            value={p.code}
            onChange={(e) => p.setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        )}
        <Card padded={false}>
          <div className="flex items-center gap-3 px-5 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium text-ink">I'm 18 or over</p>
              <p className="text-caption text-slate">Visa One is for adults in this version.</p>
            </div>
            <Toggle label="I'm 18 or over" on={p.adult} onChange={p.setAdult} />
          </div>
        </Card>
      </div>
    </div>
  );
}

const PRIVACY_TEXT = [
  "Visa One shows your Visa card payments in one place to help you budget.",
  "In this prototype, everything stays on this device. Nothing is sent anywhere.",
  "We don't sell your data or use it to advertise to you. Partners never see you or your payments.",
  "You choose what Visa One can see, and you can download or delete your data at any time.",
];
const TERMS_TEXT = [
  "Visa One is free and included with your Visa card.",
  "It gives guidance, not financial advice.",
  "You must be 18 or over to use it.",
  "You can stop using it at any time. Your bank cards keep working as normal.",
];

function YourData() {
  const [sheet, setSheet] = useState<"privacy" | "terms" | null>(null);
  const promises = [
    "Only your Visa card payments",
    "No bank balance or other accounts",
    "Guidance, not financial advice",
    "Switch off or delete any time",
  ];
  return (
    <div>
      <StepIntro title="Your data, your choice" caption="Four plain promises before we start." />
      <Card padded={false}>
        <div className="px-5">
          <List>
            {promises.map((t) => (
              <ListRow key={t} leading={<RowIcon icon={CircleCheck} tone="ok" />} title={t} wrap />
            ))}
          </List>
        </div>
      </Card>
      <div className="mt-3 flex gap-4">
        <Button variant="text" onClick={() => setSheet("privacy")}>
          Privacy
        </Button>
        <Button variant="text" onClick={() => setSheet("terms")}>
          Terms
        </Button>
      </div>
      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet === "terms" ? "Terms" : "Privacy"} caption="In plain English.">
        <ul className="flex flex-col gap-3">
          {(sheet === "terms" ? TERMS_TEXT : PRIVACY_TEXT).map((t) => (
            <li key={t} className="flex gap-3 text-body text-ink">
              <Check size={ICON.sm} strokeWidth={ICON.stroke} className="mt-0.5 shrink-0 text-ok-ink" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

function ConnectCards() {
  const { state, setState } = useStore();
  return (
    <div>
      <StepIntro title="Which cards should Visa One see?" caption="Only Visa cards. You can change this any time." />
      <Card padded={false}>
        <div className="px-5">
          <List>
            {state.cards.map((c) => (
              <div key={c.id} className="flex min-h-row items-center gap-3 py-3">
                <CardTile card={c} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-ink">{c.bank}</p>
                  <p className="flex items-center gap-1.5 text-caption text-slate">
                    <Flag country={c.country} />
                    <span className="truncate capitalize">
                      {COUNTRY_SHORT[c.country]} · {c.currency} · {c.type}
                    </span>
                  </p>
                </div>
                <Toggle
                  label={`Connect ${c.bank} card ending ${c.last4}`}
                  on={c.connected}
                  onChange={(v) =>
                    setState((s) => ({ ...s, cards: s.cards.map((x) => (x.id === c.id ? { ...x, connected: v } : x)) }))
                  }
                />
              </div>
            ))}
          </List>
        </div>
      </Card>
      <p className="mt-4 text-label font-normal text-slate">Only Visa cards can be added.</p>
      <p className="mt-1 text-label font-normal text-slate">
        Visa One only sees your Visa card payments. It does not see your bank balance or other accounts.
      </p>
    </div>
  );
}

const SEE_ROWS: { key: keyof Consent; title: string; needed: boolean; why: string }[] = [
  {
    key: "cardPayments",
    title: "Card payments",
    needed: true,
    why: "Visa One needs your Visa card payments to show what you've spent and to forecast your payday.",
  },
  {
    key: "categories",
    title: "Spending categories",
    needed: true,
    why: "Categories group your payments into habits, like takeaways or transport, so changes are easy to spot.",
  },
  {
    key: "personalisedRewards",
    title: "Personalised rewards",
    needed: false,
    why: "If you switch this on, meeting a weekly, monthly or yearly goal can unlock a partner reward. Partners never see you or your payments. It stays off unless you choose it.",
  },
];

export function WhatItCanSee() {
  const { state, setState } = useStore();
  const [why, setWhy] = useState<(typeof SEE_ROWS)[number] | null>(null);
  return (
    <div>
      <StepIntro title="What can Visa One see?" caption="Two are needed to work. Rewards stay off unless you switch them on." />
      <Card padded={false}>
        <div className="px-5">
          <List>
            {SEE_ROWS.map((r) => (
              <div key={r.key} className="flex min-h-row items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-body font-medium text-ink">
                    {r.title} {r.needed && <Tag>Needed</Tag>}
                  </p>
                  <Button variant="text" onClick={() => setWhy(r)}>
                    Why we ask
                  </Button>
                </div>
                <Toggle
                  label={r.title}
                  on={state.consent[r.key]}
                  disabled={r.needed}
                  onChange={(v) => setState((s) => ({ ...s, consent: { ...s.consent, [r.key]: v } }))}
                />
              </div>
            ))}
          </List>
        </div>
      </Card>
      <Sheet open={why !== null} onClose={() => setWhy(null)} title={`Why we ask: ${why?.title.toLowerCase() ?? ""}`}>
        <p className="text-body text-ink">{why?.why}</p>
      </Sheet>
    </div>
  );
}

function Paydays() {
  const { state, setState } = useStore();
  const [editing, setEditing] = useState<Payday | null>(null);
  const [adding, setAdding] = useState(false);
  const currencies = [
    ...new Set<CurrencyCode>([
      ...state.paydays.map((p) => p.currency),
      ...(Object.keys(state.moneyUntilPayday) as CurrencyCode[]),
    ]),
  ];
  return (
    <div>
      <StepIntro title="When does money come in?" caption="Visa can't see your income, so you tell us." />
      <Card padded={false}>
        <div className="px-5">
          <List>
            {state.paydays.map((p) => (
              <ListRow
                key={p.id}
                leading={<RowIcon icon={Wallet} />}
                title={p.name}
                caption={`${CURRENCY_SYMBOL[p.currency]}${formatAmount(p.amount)} · ${frequencyLabel(p.frequency)} · next ${formatDate(p.nextDate)}`}
                onClick={() => setEditing(p)}
                chevron
              />
            ))}
          </List>
        </div>
      </Card>
      <Button
        full
        variant="secondary"
        className="mt-3"
        icon={<Plus size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden />}
        onClick={() => setAdding(true)}
      >
        Add a payday
      </Button>

      <h2 className="mt-8 text-heading text-visa-navy">Money until your next payday</h2>
      <p className="mt-1 text-label font-normal text-slate">Roughly how much do you have to live on until then?</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {currencies.map((c) => (
          <AmountInput
            key={c}
            label={c}
            currency={c}
            value={state.moneyUntilPayday[c] ?? 0}
            onChange={(v) => setState((s) => ({ ...s, moneyUntilPayday: { ...s.moneyUntilPayday, [c]: v } }))}
          />
        ))}
      </div>

      <PaydaySheet open={adding} onClose={() => setAdding(false)} />
      <PaydaySheet open={editing !== null} payday={editing ?? undefined} onClose={() => setEditing(null)} />
    </div>
  );
}

const TONES: Tone[] = ["Professional", "Personal", "Sassy"];

export function TonePicker() {
  const { state, setTone } = useStore();
  return (
    <div role="radiogroup" aria-label="Tone" className="flex flex-col gap-3">
      {TONES.map((t) => {
        const selected = state.tone === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTone(t)}
            className={`flex w-full items-start gap-3 rounded-card bg-surface p-5 text-left shadow-card transition-shadow duration-150 ${
              selected ? "ring-2 ring-visa-blue" : ""
            }`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                selected ? "border-visa-blue bg-visa-blue text-white" : "border-slate"
              }`}
              aria-hidden
            >
              {selected && <Check size={14} strokeWidth={2.5} />}
            </span>
            <span className="min-w-0">
              <span className="block text-body font-semibold text-ink">{t}</span>
              <span className="mt-1 block text-label font-normal text-slate">“{TONE_PREVIEW[t]}”</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Voice() {
  const { state } = useStore();
  const m = useMotion();
  return (
    <div>
      <StepIntro title="How should Visa One talk to you?" caption="Tone changes the words, never the numbers. Change it any time." />
      <div className="mb-4 rounded-card bg-blue-tint p-5" aria-live="polite">
        <Eyebrow>Preview</Eyebrow>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={state.tone} className="mt-2 text-body font-medium text-ink" {...m.reveal} exit={{ opacity: 0 }}>
            {TONE_PREVIEW[state.tone]}
          </motion.p>
        </AnimatePresence>
      </div>
      <TonePicker />
    </div>
  );
}

// ---------------------------------------------------------------------------
// S9 Building your view, S10 First insight
// ---------------------------------------------------------------------------

function Building() {
  const { state } = useStore();
  const m = useMotion();
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const a = window.setTimeout(() => setShown(2), BUILDING_MS / 3);
    const b = window.setTimeout(() => setShown(3), (BUILDING_MS / 3) * 2);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);
  const connected = state.cards.filter((c) => c.connected);
  const currencies = new Set(connected.map((c) => c.currency)).size;
  const lines = [
    `Reading ${connected.length} Visa card${connected.length === 1 ? "" : "s"}`,
    `Sorting ${currencies} currenc${currencies === 1 ? "y" : "ies"}`,
    "Checking your paydays",
  ];
  return (
    <div className="flex h-full flex-col justify-center bg-canvas px-5" aria-live="polite">
      <h1 className="text-title text-visa-navy">Building your view</h1>
      <ul className="mt-6 flex flex-col gap-4">
        {lines.slice(0, shown).map((l) => (
          <motion.li key={l} className="flex items-center gap-3 text-body text-ink" {...m.reveal}>
            <RowIcon icon={Check} tone="ok" />
            {l}
          </motion.li>
        ))}
      </ul>
      <Card className="mt-10" label="Loading your dashboard">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </Card>
    </div>
  );
}

function FirstInsight({ onDone }: { onDone: () => void }) {
  const { state } = useStore();
  const m = useMotion();
  const [budgetOpen, setBudgetOpen] = useState(false);
  const f = forecastForCurrency(state, "GBP") ?? allForecasts(state)[0];
  const line = f ? forecastSummaryLine(f, state.tone) : "You're all set. Add a payday any time to get a forecast.";
  return (
    <div className="flex h-full flex-col bg-hero px-5 text-white">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Eyebrow onDark>Your first insight</Eyebrow>
        {f && (
          <motion.div className="mt-6" {...m.hero}>
            <Ring
              status={f.short ? "short" : "ok"}
              amount={approxWhole(f.short ? f.shortfall : f.safeToSpend, f.short ? "shortfall" : "safe")}
              currency={f.currency}
              fraction={ringFraction(f)}
              caption={`${f.assumptions.daysToPayday} day${f.assumptions.daysToPayday === 1 ? "" : "s"} to payday`}
            />
          </motion.div>
        )}
        <p className="mt-6 text-heading text-white" data-testid="first-insight">
          {line}
        </p>
        {f && (
          <div className="mt-2 flex flex-col items-center">
            <WhyButton onDark why={forecastWhy(f, line)} />
            {f.short && <ToneSwitch onDark />}
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-1 pb-5 pt-3">
        <Button full onClick={() => setBudgetOpen(true)}>
          Set a budget
        </Button>
        <Button variant="text-on-dark" onClick={onDone}>
          Later
        </Button>
      </div>
      {/* Pre-filled from the forecast, so one tap on Save confirms it. */}
      <BudgetSheet
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        prefill={{ category: "All", period: "weekly", currency: f?.currency ?? "GBP" }}
        onSaved={onDone}
      />
    </div>
  );
}
