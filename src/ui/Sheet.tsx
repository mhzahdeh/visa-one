// Sheet.tsx — the bottom sheet used for every "See why", card action, add payday,
// add budget or goal, Not my pattern and confirmation. Never a full-page modal.

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import { useOverlayRoot } from "./PhoneFrame";
import { useMotion } from "./motion";
import { IconButton } from "./Button";
import { ICON } from "./icons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  caption?: string;
  children: ReactNode;
  /** Pinned actions at the bottom of the sheet. */
  footer?: ReactNode;
}

export function Sheet({ open, onClose, title, caption, children, footer }: SheetProps) {
  const root = useOverlayRoot();
  const m = useMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useDragControls();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus the sheet on open, close on Escape, give focus back on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    // preventScroll: the panel starts below the screen (it slides up). Without this,
    // Safari scrolls the whole phone frame to reach it, and the layout jumps.
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const content = (
    <AnimatePresence>
      {open && (
        <div key="sheet" className="pointer-events-auto absolute inset-0 flex flex-col justify-end">
          <motion.div
            className="absolute inset-0 bg-scrim"
            aria-hidden
            onClick={() => onCloseRef.current()}
            {...m.backdrop}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-sheet="bottom"
            tabIndex={-1}
            className="relative flex max-h-[88%] flex-col rounded-t-sheet bg-surface shadow-float focus:outline-none"
            drag={m.reduced ? false : "y"}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onCloseRef.current();
            }}
            {...m.sheet}
          >
            <div
              className="flex cursor-grab touch-none justify-center pb-1 pt-3"
              onPointerDown={(e) => drag.start(e)}
              aria-hidden
            >
              <span className="h-1 w-10 rounded-full bg-line" />
            </div>
            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-1">
              <div className="min-w-0 pt-2">
                <h2 id={titleId} className="text-heading text-visa-navy">
                  {title}
                </h2>
                {caption && <p className="mt-1 text-label font-normal text-slate">{caption}</p>}
              </div>
              <IconButton label="Close" onClick={() => onCloseRef.current()}>
                <X size={ICON.sm} strokeWidth={ICON.stroke} />
              </IconButton>
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            {footer && (
              <div className="flex flex-col gap-2 border-t border-line px-5 pb-5 pt-3">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, root ?? document.body);
}
