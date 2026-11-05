// CardSheets.tsx — card detail and Manage (rename, include in totals, remove, delete),
// and Add a card. Remove keeps history; delete erases it after a confirm step.
// One sheet with three modes, so it never drops and re-opens.

import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { Card } from "../domain/types";
import { COUNTRY_NAME } from "../domain/types";
import { cardBreakdowns, type Period } from "../domain/forecastRules";
import { toastText } from "../domain/textWriter";
import { AVAILABLE_CARDS } from "../state/initialState";
import { addCard, deleteCard, removeCard, updateCard, useStore } from "../state/store";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { TextField } from "../ui/Field";
import { Toggle } from "../ui/Toggle";
import { List, ListRow } from "../ui/ListRow";
import { CardTile, Flag } from "../ui/Brand";
import { Money } from "../ui/Money";
import { useToast } from "../ui/Toast";
import { useUndoableSave } from "../ui/undo";
import { ICON } from "../ui/icons";

type Mode = "detail" | "rename" | "confirm";

export function CardDetailSheet({
  card,
  period,
  open,
  onClose,
}: {
  card: Card | null;
  period: Period;
  open: boolean;
  onClose: () => void;
}) {
  const { state, setState } = useStore();
  const toast = useToast();
  const commit = useUndoableSave();
  const [mode, setMode] = useState<Mode>("detail");
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setMode("detail");
  }, [open]);

  const live = card ? state.cards.find((c) => c.id === card.id) ?? card : null;
  const row = live ? cardBreakdowns(state, period).find((r) => r.card.id === live.id) : undefined;

  if (!live) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;

  const titles: Record<Mode, string> = {
    detail: live.nickname,
    rename: "Rename card",
    confirm: "Delete this card from Visa One?",
  };

  const footer =
    mode === "confirm" ? (
      <>
        <Button full variant="secondary" onClick={() => setMode("detail")}>
          Keep this card
        </Button>
        <Button
          variant="danger-text"
          onClick={() => {
            setState((s) => deleteCard(s, live.id));
            onClose();
            toast({ message: "Card deleted from Visa One" });
          }}
        >
          Yes, delete card and its history
        </Button>
      </>
    ) : mode === "rename" ? (
      <>
        <div aria-live="polite" className="rounded-input bg-blue-tint px-4 py-3 text-label text-ink">
          Shows as <span className="font-semibold">“{name.trim() || live.bank}”</span> on Home and in Control.
        </div>
        <Button
          full
          disabled={name.trim().length === 0}
          onClick={() => {
            commit(["cards"], (s) => updateCard(s, live.id, { nickname: name.trim() }), toastText("cardRenamed", state.tone));
            setMode("detail");
          }}
        >
          Save name
        </Button>
        <Button variant="quiet" onClick={() => setMode("detail")}>
          Cancel
        </Button>
      </>
    ) : (
      <>
        <Button
          full
          variant="secondary"
          onClick={() => {
            setState((s) => removeCard(s, live.id));
            onClose();
            toast({
              message: toastText("cardRemoved", state.tone),
              actionLabel: "Undo",
              onAction: () => setState((s) => addCard(s, live)),
            });
          }}
        >
          Remove from Visa One
        </Button>
        <Button variant="danger-text" onClick={() => setMode("confirm")}>
          Delete card and its history
        </Button>
      </>
    );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={titles[mode]}
      caption={mode === "detail" ? `${live.bank} · ${COUNTRY_NAME[live.country]} · ${live.currency}` : undefined}
      footer={footer}
    >
      {mode === "confirm" && (
        <p className="text-body text-ink">This deletes this card's payment history in Visa One. Your bank card is not affected.</p>
      )}
      {mode === "rename" && (
        <TextField label="Nickname" value={name} autoFocus maxLength={24} onChange={(e) => setName(e.target.value)} />
      )}
      {mode === "detail" && (
        <div className="flex flex-col gap-5">
          <CardTile card={live} size="lg" />
          {row && (
            <div className="grid grid-cols-3 gap-3">
              <Stat label={`This ${period}`}>
                <Money amount={row.spent} currency={live.currency} />
              </Stat>
              <Stat label={`Share of ${live.currency}`}>{Math.round(row.shareOfCurrency * 100)}%</Stat>
              <Stat label="Top category">{row.topCategory ?? "None"}</Stat>
            </div>
          )}
          <ListRow
            onClick={() => {
              setName(live.nickname);
              setMode("rename");
            }}
            title="Nickname"
            caption={live.nickname}
            trailing={<Pencil size={ICON.sm} strokeWidth={ICON.stroke} className="text-visa-blue" aria-hidden />}
            ariaLabel={`Rename card, now ${live.nickname}`}
          />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-body font-medium text-ink">Include in totals</p>
              <p className="text-caption text-slate">Turn off to leave this card out of what you've spent.</p>
            </div>
            <Toggle
              label="Include in totals"
              on={live.includedInTotals}
              onChange={(v) => setState((s) => updateCard(s, live.id, { includedInTotals: v }))}
            />
          </div>
          <p className="text-caption text-slate">
            Remove hides this card from Visa One. The card itself still works and can be added back with its history.
          </p>
        </div>
      )}
    </Sheet>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-input bg-canvas p-3">
      <p className="text-caption text-slate">{label}</p>
      <p className="tabular mt-1 truncate text-body font-semibold text-ink">{children}</p>
    </div>
  );
}

export function AddCardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, setState } = useStore();
  const toast = useToast();
  const addable = [
    ...state.cards.filter((c) => !c.connected),
    ...AVAILABLE_CARDS.filter((a) => !state.cards.some((c) => c.id === a.id)),
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Add a card" caption="Visa cards your banks have enrolled, in any country.">
      {addable.length === 0 ? (
        <p className="text-label font-normal text-slate">No more Visa cards to add right now.</p>
      ) : (
        <List>
          {addable.map((c) => (
            <ListRow
              key={c.id}
              leading={<CardTile card={c} size="sm" />}
              title={c.nickname}
              caption={
                <span className="inline-flex items-center gap-1.5">
                  <Flag country={c.country} /> {c.bank} · {c.currency} · •• {c.last4}
                </span>
              }
              trailing={
                <Button
                  variant="text"
                  icon={<Plus size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden />}
                  onClick={() => {
                    setState((s) => addCard(s, c));
                    toast({ message: `${c.nickname} added` });
                  }}
                >
                  Add
                </Button>
              }
            />
          ))}
        </List>
      )}
      <p className="mt-4 rounded-input bg-canvas p-4 text-label font-normal text-ink">
        Only Visa cards can be added. Non-Visa cards and bank accounts can't be added. To add a whole bank, use Banks and cards in
        Control.
      </p>
    </Sheet>
  );
}
