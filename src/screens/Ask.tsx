// Ask.tsx — Ask Visa One. Answers use only the user's own data and end with
// "How we worked this out". Out-of-scope topics offer "Ask my bank" (R2, R3).

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Building2, ChevronDown } from "lucide-react";
import { answer, SUGGESTED_QUESTIONS, type Answer } from "../domain/askEngine";
import { useStore } from "../state/store";
import { AppHeader } from "../ui/AppHeader";
import { Card, CardHeader, Stack } from "../ui/Card";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { useMotion } from "../ui/motion";
import { ICON } from "../ui/icons";
import { ToneSwitch } from "../ui/ToneSwitch";
import type { Tone } from "../domain/config";

interface Turn {
  id: number;
  question: string;
  answer: Answer;
  tone: Tone;
}

export function Ask() {
  const { state } = useStore();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  }, [turns.length]);

  function send(q: string) {
    const question = q.trim();
    if (!question) return;
    setTurns((prev) => [...prev, { id: prev.length + 1, question, answer: answer(state, question, state.tone), tone: state.tone }]);
    setInput("");
  }

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader title="Ask Visa One" caption="Answers from your own card data only. Never advice." />
      <Stack className="flex-1">
        {turns.length === 0 && (
          <Card label="Suggested questions">
            <CardHeader title="Try asking" />
            <Suggestions onPick={send} />
          </Card>
        )}
        {turns.map((t) => (
          <TurnView key={t.id} turn={t} />
        ))}
        {turns.length > 0 && <Suggestions onPick={send} compact />}
        <div ref={endRef} />
      </Stack>

      <form
        className="sticky bottom-tabbar z-10 mt-4 bg-canvas px-5 pb-1 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="flex items-center gap-2 rounded-full bg-surface p-1.5 pl-5 shadow-float">
          <label htmlFor="ask-input" className="sr-only">
            Ask about your spending
          </label>
          <input
            id="ask-input"
            className="h-11 min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-slate focus:outline-none"
            placeholder="Ask about your spending"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            aria-label="Ask"
            disabled={!input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-visa-blue text-white disabled:opacity-40"
          >
            <ArrowUp size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}

function Suggestions({ onPick, compact }: { onPick: (q: string) => void; compact?: boolean }) {
  return (
    <div role="group" aria-label="Suggested questions" className="flex flex-wrap gap-2">
      {SUGGESTED_QUESTIONS.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onPick(q)}
          className={`min-h-11 rounded-full px-4 py-2 text-left text-label ${
            compact ? "bg-surface text-ink shadow-card" : "bg-blue-tint text-visa-blue"
          }`}
        >
          {q}
        </button>
      ))}
    </div>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  const m = useMotion();
  const toast = useToast();
  const [howOpen, setHowOpen] = useState(false);
  const a = turn.answer;
  return (
    <motion.div className="flex flex-col gap-2" {...m.reveal}>
      <p className="ml-auto max-w-[85%] rounded-card rounded-br-md bg-visa-blue px-4 py-3 text-body text-white">
        {turn.question}
      </p>
      <div className="mr-auto w-[92%] rounded-card rounded-bl-md bg-surface px-4 py-3 shadow-card">
        <p className="text-body text-ink">{a.text}</p>
        <button
          type="button"
          aria-expanded={howOpen}
          onClick={() => setHowOpen((v) => !v)}
          className="mt-1 flex min-h-11 items-center gap-1 text-label font-semibold text-visa-blue"
        >
          How we worked this out
          <ChevronDown
            size={ICON.sm}
            strokeWidth={ICON.stroke}
            aria-hidden
            className={`transition-transform duration-150 ${howOpen ? "rotate-180" : ""}`}
          />
        </button>
        {howOpen && <p className="tabular pb-1 text-label font-normal text-slate">{a.how}</p>}
        {a.shortfall && turn.tone === "Sassy" && <ToneSwitch />}
        {a.offerAskBank && (
          <div className="mt-2 rounded-input bg-canvas p-4">
            <p className="flex items-center gap-2 text-body font-medium text-ink">
              <Building2 size={ICON.sm} strokeWidth={ICON.stroke} className="text-visa-blue" aria-hidden />
              This one's for {a.handoffBank ?? "your bank"}
            </p>
            <p className="mt-1 text-label font-normal text-slate">
              Your bank handles this directly. We'll hand you over with the card details.
            </p>
            <Button
              full
              variant="secondary"
              className="mt-3"
              onClick={() => toast({ message: `Demo: this would open ${a.handoffBank ?? "your bank"}` })}
            >
              Ask my bank
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
