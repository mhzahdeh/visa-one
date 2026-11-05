// PaymentSheet.tsx — a payment's details and "Not my pattern" (R6).

import type { Transaction } from "../domain/types";
import { formatDate } from "../domain/dates";
import { toastText } from "../domain/textWriter";
import { toggleNotMyPattern, useStore } from "../state/store";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { Money } from "../ui/Money";
import { useToast } from "../ui/Toast";

export const NOT_MY_PATTERN_COPY =
  "Got it. This still counts in what you've spent and in your payday forecast, but it won't shape your habits, insights or rewards.";

export function PaymentSheet({ tx, open, onClose }: { tx: Transaction | null; open: boolean; onClose: () => void }) {
  const { state, setState } = useStore();
  const toast = useToast();
  const live = tx ? state.transactions.find((t) => t.id === tx.id) ?? tx : null;
  const card = live ? state.cards.find((c) => c.id === live.cardId) : undefined;
  if (!live) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;

  const toggle = () => {
    const marking = !live.notMyPattern;
    setState((s) => toggleNotMyPattern(s, live.id));
    if (marking) {
      toast({
        message: toastText("notMyPattern", state.tone),
        actionLabel: "Undo",
        onAction: () => setState((s) => toggleNotMyPattern(s, live.id)),
      });
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={live.merchant}
      caption={`${live.category} · ${formatDate(live.date)}${card ? ` · ${card.nickname} •• ${card.last4}` : ""}`}
      footer={
        <Button full variant={live.notMyPattern ? "secondary" : "primary"} onClick={toggle}>
          {live.notMyPattern ? "Undo Not my pattern" : "Not my pattern"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-display text-visa-navy">
          <Money amount={live.amount} currency={live.currency} />
        </p>
        {live.notMyPattern ? (
          <p className="rounded-input bg-blue-tint p-4 text-label font-normal text-ink">{NOT_MY_PATTERN_COPY}</p>
        ) : (
          <p className="text-label font-normal text-slate">
            Not really you, like a gift for someone else? Mark it and it won't shape your habits, insights or rewards. It
            still counts in what you've spent.
          </p>
        )}
      </div>
    </Sheet>
  );
}
