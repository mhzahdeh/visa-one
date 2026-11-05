// BankSheets.tsx — add a bank (searchable list, choose cards, consent) and remove a bank
// (history kept, with a separate, clearly marked option to delete its data).

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { BANKS, bankByName, type Bank } from "../data/banks";
import { COUNTRY_NAME } from "../domain/types";
import { toastText } from "../domain/textWriter";
import { addBank, deleteBankData, removeBank, useStore } from "../state/store";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { TextField } from "../ui/Field";
import { Toggle } from "../ui/Toggle";
import { List, ListRow } from "../ui/ListRow";
import { BankTile, CardTile, Flag } from "../ui/Brand";
import { Tag } from "../ui/Chip";
import { useToast } from "../ui/Toast";
import { ICON } from "../ui/icons";

export function AddBankSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, setState } = useStore();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [bank, setBank] = useState<Bank | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setBank(null);
  }, [open]);

  const isConnected = (cardId: string) => state.cards.some((c) => c.id === cardId && c.connected);
  const pick = (b: Bank) => {
    setBank(b);
    setChosen(b.cards.filter((c) => !isConnected(c.id)).map((c) => c.id));
    setConsent(false);
  };

  const q = query.trim().toLowerCase();
  const results = BANKS.filter(
    (b) => !q || b.name.toLowerCase().includes(q) || COUNTRY_NAME[b.country].toLowerCase().includes(q) || b.currency.toLowerCase().includes(q)
  );

  if (bank) {
    const toConnect = chosen.filter((id) => !isConnected(id));
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={bank.name}
        caption={`Choose which Visa cards from ${bank.name} Visa One can see.`}
        footer={
          <>
            <Button
              full
              disabled={!consent || toConnect.length === 0}
              onClick={() => {
                setState((s) => addBank(s, bank.id, toConnect));
                toast({ message: toastText("bankAdded", state.tone, bank.name) });
                onClose();
              }}
            >
              Connect {toConnect.length} card{toConnect.length === 1 ? "" : "s"}
            </Button>
            <Button variant="quiet" icon={<ArrowLeft size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden />} onClick={() => setBank(null)}>
              Back to banks
            </Button>
          </>
        }
      >
        <List>
          {bank.cards.map((c) => {
            const connected = isConnected(c.id);
            const known = state.cards.some((x) => x.id === c.id);
            return (
              <div key={c.id} className="flex min-h-row items-center gap-3 py-3">
                <CardTile card={c} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-ink">Visa {c.type} •• {c.last4}</p>
                  <p className="flex items-center gap-1.5 text-caption text-slate">
                    <Flag country={c.country} />
                    {c.currency}
                    {known && !connected ? " · history kept" : ""}
                  </p>
                </div>
                {connected ? (
                  <Tag>Connected</Tag>
                ) : (
                  <Toggle
                    label={`Connect Visa ${c.type} ending ${c.last4}`}
                    on={chosen.includes(c.id)}
                    onChange={(v) => setChosen((prev) => (v ? [...prev, c.id] : prev.filter((x) => x !== c.id)))}
                  />
                )}
              </div>
            );
          })}
        </List>
        <div className="mt-4 flex items-center gap-3 rounded-input bg-canvas p-4">
          <p className="min-w-0 flex-1 text-label font-normal text-ink">
            I agree Visa One can see payments on the cards I chose from {bank.name}. Not my bank balance or other accounts.
          </p>
          <Toggle label={`Consent for ${bank.name}`} on={consent} onChange={setConsent} />
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add a bank" caption="Participating banks that offer Visa One. All fictional in this demo.">
      <TextField
        label="Search banks"
        placeholder="Bank, country or currency"
        prefix={<Search size={16} strokeWidth={ICON.stroke} aria-hidden />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="mt-3">
        {results.length === 0 ? (
          <p className="py-4 text-label font-normal text-slate">No participating bank matches “{query}”.</p>
        ) : (
          <List>
            {results.map((b) => {
              const all = b.cards.every((c) => isConnected(c.id));
              const some = b.cards.some((c) => isConnected(c.id));
              return (
                <ListRow
                  key={b.id}
                  onClick={() => pick(b)}
                  ariaLabel={`${b.name}, ${COUNTRY_NAME[b.country]}${all ? ", added" : ""}`}
                  leading={<BankTile bank={b} />}
                  title={b.name}
                  caption={
                    <span className="inline-flex items-center gap-1.5">
                      <Flag country={b.country} /> {COUNTRY_NAME[b.country]} · {b.currency} · {b.cards.length} Visa card
                      {b.cards.length === 1 ? "" : "s"}
                    </span>
                  }
                  trailing={all ? <Tag>Added</Tag> : some ? <Tag>Partly added</Tag> : <ChevronRight size={ICON.sm} strokeWidth={ICON.stroke} className="text-slate" aria-hidden />}
                />
              );
            })}
          </List>
        )}
      </div>
    </Sheet>
  );
}

export function RemoveBankSheet({ bankName, open, onClose }: { bankName: string | null; open: boolean; onClose: () => void }) {
  const { state, setState } = useStore();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (open) setDeleting(false);
  }, [open]);
  if (!bankName) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;

  const bank = bankByName(bankName);
  const cards = state.cards.filter((c) => c.bank === bankName && c.connected);
  const n = cards.length;
  const cardWord = `${n} card${n === 1 ? "" : "s"}`;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={deleting ? `Delete ${bankName}'s data?` : `Remove ${bankName}?`}
      footer={
        deleting ? (
          <>
            <Button full variant="secondary" onClick={() => setDeleting(false)}>
              Keep the data
            </Button>
            <Button
              variant="danger-text"
              onClick={() => {
                setState((s) => deleteBankData(s, bankName));
                toast({ message: toastText("bankDeleted", state.tone, bankName) });
                onClose();
              }}
            >
              Yes, delete {bankName}'s data
            </Button>
          </>
        ) : (
          <>
            <Button
              full
              onClick={() => {
                const ids = cards.map((c) => c.id);
                setState((s) => removeBank(s, bankName));
                toast({
                  message: toastText("bankRemoved", state.tone, bankName),
                  actionLabel: "Undo",
                  onAction: () => bank && setState((s) => addBank(s, bank.id, ids)),
                });
                onClose();
              }}
            >
              Remove {bankName}
            </Button>
            <div className="flex items-center justify-between">
              <Button variant="quiet" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="danger-text" onClick={() => setDeleting(true)}>
                Also delete this bank's data
              </Button>
            </div>
          </>
        )
      }
    >
      <p className="text-body text-ink">
        {deleting
          ? `This erases ${bankName}'s ${cardWord} and their payment history from Visa One. Your bank cards keep working. This can't be undone.`
          : `This removes ${bankName} and its ${cardWord} from Visa One. Your bank cards keep working. Your history is kept so you can add the bank back.`}
      </p>
    </Sheet>
  );
}
