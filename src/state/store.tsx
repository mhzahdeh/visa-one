// store.tsx — React context holding AppState in localStorage. Download/delete work for
// real (export + clear localStorage). Demo reset restores the seed state.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { LOCALSTORAGE_KEY, type CurrencyCode, type Tone } from "../domain/config";
import type {
  AppState,
  Budget,
  Card,
  Goal,
  Payday,
  WhyLogEntry,
} from "../domain/types";
import { buildSeedState } from "./initialState";
import { BANKS, demoTransactionsFor } from "../data/banks";

interface StoreValue {
  state: AppState;
  setState: (updater: (s: AppState) => AppState) => void;
  // High-level actions
  reset: () => void;
  exportData: () => void;
  deleteData: () => void;
  logWhy: (entry: Omit<WhyLogEntry, "id" | "at">) => void;
  setTone: (tone: Tone) => void;
  setBaseCurrency: (c: CurrencyCode) => void;
  setFirstName: (name: string | null) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function load(): AppState {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    // ignore corrupt storage
  }
  return buildSeedState();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setRawState] = useState<AppState>(() => load());

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be unavailable; app still works in memory
    }
  }, [state]);

  const setState = useCallback((updater: (s: AppState) => AppState) => {
    setRawState((prev) => updater(prev));
  }, []);

  const reset = useCallback(() => {
    const fresh = buildSeedState();
    setRawState(fresh);
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(fresh));
    } catch {
      /* noop */
    }
  }, []);

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "visa-one-my-data.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [state]);

  const deleteData = useCallback(() => {
    try {
      localStorage.removeItem(LOCALSTORAGE_KEY);
    } catch {
      /* noop */
    }
    setRawState(buildSeedState());
  }, []);

  const logWhy = useCallback((entry: Omit<WhyLogEntry, "id" | "at">) => {
    setRawState((prev) => {
      // De-duplicate by text so the log doesn't balloon on re-render.
      if (prev.whyLog.some((w) => w.text === entry.text && w.kind === entry.kind)) {
        return prev;
      }
      const full: WhyLogEntry = {
        ...entry,
        id: `why-${prev.whyLog.length + 1}-${Date.now()}`,
        at: new Date().toISOString(),
      };
      return { ...prev, whyLog: [full, ...prev.whyLog].slice(0, 100) };
    });
  }, []);

  const setTone = useCallback(
    (tone: Tone) => setRawState((p) => ({ ...p, tone })),
    []
  );
  const setBaseCurrency = useCallback(
    (baseCurrency: CurrencyCode) => setRawState((p) => ({ ...p, baseCurrency })),
    []
  );
  const setFirstName = useCallback(
    (firstName: string | null) => setRawState((p) => ({ ...p, firstName })),
    []
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      setState,
      reset,
      exportData,
      deleteData,
      logWhy,
      setTone,
      setBaseCurrency,
      setFirstName,
    }),
    [state, setState, reset, exportData, deleteData, logWhy, setTone, setBaseCurrency, setFirstName]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// --- Mutation helpers (pure state transforms used by screens) ---

export function addCard(state: AppState, card: Card): AppState {
  // If the card existed before (removed), re-connect it with its history.
  const existing = state.cards.find((c) => c.id === card.id);
  if (existing) {
    return {
      ...state,
      cards: state.cards.map((c) =>
        c.id === card.id ? { ...c, connected: true } : c
      ),
    };
  }
  return { ...state, cards: [...state.cards, { ...card, connected: true }] };
}

export function updateCard(state: AppState, id: string, patch: Partial<Card>): AppState {
  return {
    ...state,
    cards: state.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  };
}

/** Remove = hide but keep history (card still works, can be added back). */
export function removeCard(state: AppState, id: string): AppState {
  return updateCard(state, id, { connected: false });
}

/** Delete = disconnect AND erase this card's transactions from Visa One. */
export function deleteCard(state: AppState, id: string): AppState {
  return {
    ...state,
    cards: state.cards.filter((c) => c.id !== id),
    transactions: state.transactions.filter((t) => t.cardId !== id),
    upcoming: state.upcoming.filter((u) => u.cardId !== id),
  };
}

export function toggleNotMyPattern(state: AppState, txId: string): AppState {
  return {
    ...state,
    transactions: state.transactions.map((t) =>
      t.id === txId ? { ...t, notMyPattern: !t.notMyPattern } : t
    ),
  };
}

export function addPayday(state: AppState, payday: Payday): AppState {
  return { ...state, paydays: [...state.paydays, payday] };
}
export function updatePayday(state: AppState, id: string, patch: Partial<Payday>): AppState {
  return {
    ...state,
    paydays: state.paydays.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  };
}
export function removePayday(state: AppState, id: string): AppState {
  return { ...state, paydays: state.paydays.filter((p) => p.id !== id) };
}

export function addBudget(state: AppState, budget: Budget): AppState {
  return { ...state, budgets: [...state.budgets, budget] };
}
/** Create or replace a budget by id. */
export function saveBudget(state: AppState, budget: Budget): AppState {
  return state.budgets.some((b) => b.id === budget.id)
    ? { ...state, budgets: state.budgets.map((b) => (b.id === budget.id ? budget : b)) }
    : addBudget(state, budget);
}
/** Create or replace a goal by id. */
export function saveGoal(state: AppState, goal: Goal): AppState {
  return state.goals.some((g) => g.id === goal.id)
    ? { ...state, goals: state.goals.map((g) => (g.id === goal.id ? goal : g)) }
    : { ...state, goals: [...state.goals, goal] };
}
/** Create or replace a payday by id. */
export function savePayday(state: AppState, payday: Payday): AppState {
  const exists = state.paydays.some((p) => p.id === payday.id);
  const next = exists
    ? { ...state, paydays: state.paydays.map((p) => (p.id === payday.id ? payday : p)) }
    : { ...state, paydays: [...state.paydays, payday] };
  // A new payday currency gets a "money until payday" field.
  return { ...next, moneyUntilPayday: { [payday.currency]: 0, ...state.moneyUntilPayday } };
}

// --- Banks (change request 2) ---

/**
 * Add a bank's chosen cards. Cards Visa One already knows (a removed bank or card) are
 * reconnected with their history; new cards come with their demo transactions.
 */
export function addBank(state: AppState, bankId: string, cardIds: string[]): AppState {
  const bank = BANKS.find((b) => b.id === bankId);
  if (!bank) return state;
  let next = state;
  for (const c of bank.cards.filter((x) => cardIds.includes(x.id))) {
    const known = next.cards.find((x) => x.id === c.id);
    if (known) {
      next = updateCard(next, c.id, { connected: true });
    } else {
      const hasHistory = next.transactions.some((t) => t.cardId === c.id);
      next = {
        ...next,
        cards: [...next.cards, { ...c, connected: true }],
        transactions: hasHistory ? next.transactions : [...next.transactions, ...demoTransactionsFor(c)],
      };
    }
  }
  return next;
}

/** Remove a bank: hide all its cards. History is kept so the bank can be added back. */
export function removeBank(state: AppState, bankName: string): AppState {
  return {
    ...state,
    cards: state.cards.map((c) => (c.bank === bankName ? { ...c, connected: false } : c)),
  };
}

/** Also delete the bank's data: its cards, payments and renewals are erased from Visa One. */
export function deleteBankData(state: AppState, bankName: string): AppState {
  const ids = new Set(state.cards.filter((c) => c.bank === bankName).map((c) => c.id));
  return {
    ...state,
    cards: state.cards.filter((c) => !ids.has(c.id)),
    transactions: state.transactions.filter((t) => !ids.has(t.cardId)),
    upcoming: state.upcoming.filter((u) => !ids.has(u.cardId)),
  };
}
export function removeBudget(state: AppState, id: string): AppState {
  return { ...state, budgets: state.budgets.filter((b) => b.id !== id) };
}
export function addGoal(state: AppState, goal: Goal): AppState {
  return { ...state, goals: [...state.goals, goal] };
}
export function updateGoal(state: AppState, id: string, patch: Partial<Goal>): AppState {
  return {
    ...state,
    goals: state.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
  };
}
export function removeGoal(state: AppState, id: string): AppState {
  return { ...state, goals: state.goals.filter((g) => g.id !== id) };
}
