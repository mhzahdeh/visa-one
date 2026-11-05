// undo.ts — save with a toast and Undo. Snapshots only the state keys an edit touches,
// so Undo restores exactly what that edit changed.

import { useStore } from "../state/store";
import { useToast } from "./Toast";
import type { AppState } from "../domain/types";

export function useUndoableSave() {
  const { state, setState } = useStore();
  const toast = useToast();
  return function commit<K extends keyof AppState>(keys: K[], mutate: (s: AppState) => AppState, message: string) {
    const snapshot = {} as Pick<AppState, K>;
    for (const k of keys) snapshot[k] = state[k];
    setState(mutate);
    toast({ message, actionLabel: "Undo", onAction: () => setState((s) => ({ ...s, ...snapshot })) });
  };
}
