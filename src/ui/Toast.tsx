// Toast.tsx — a small navy pill at the top, e.g. "Card removed. Undo".

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useOverlayRoot } from "./PhoneFrame";
import { useMotion } from "./motion";

interface ToastInput {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const seq = useRef(0);
  const root = useOverlayRoot();
  const m = useMotion();

  const show = useCallback((t: ToastInput) => {
    seq.current += 1;
    setToast({ ...t, id: seq.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {createPortal(
        <div className="absolute inset-x-0 top-3 z-50 flex justify-center px-5" role="status" aria-live="polite">
          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast.id}
                className="pointer-events-auto flex min-h-11 max-w-full items-center gap-3 rounded-full bg-visa-navy py-1 pl-4 pr-2 text-label text-white shadow-float"
                {...m.toast}
              >
                <span className="truncate">{toast.message}</span>
                {toast.actionLabel && (
                  <button
                    type="button"
                    className="min-h-9 shrink-0 rounded-full px-3 font-semibold text-white underline decoration-white/40 underline-offset-4"
                    onClick={() => {
                      toast.onAction?.();
                      setToast(null);
                    }}
                  >
                    {toast.actionLabel}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        root ?? document.body
      )}
    </ToastContext.Provider>
  );
}
