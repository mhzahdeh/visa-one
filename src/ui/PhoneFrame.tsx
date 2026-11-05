// PhoneFrame.tsx — full screen on a phone, a 390 x 844 device frame on desktop.
// Provides an overlay layer inside the frame for bottom sheets and toasts.

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

const OverlayContext = createContext<HTMLElement | null>(null);

/** The element sheets and toasts portal into (falls back to document.body). */
export function useOverlayRoot(): HTMLElement | null {
  return useContext(OverlayContext);
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-canvas sm:bg-line sm:p-6">
      <div
        data-frame="phone"
        // overflow-clip (not hidden): the frame can never be scrolled, by focus or by code.
        className="relative flex h-[100dvh] w-full max-w-[390px] flex-col overflow-clip bg-canvas sm:h-[844px] sm:rounded-[48px] sm:border-[10px] sm:border-ink sm:shadow-float"
      >
        <OverlayContext.Provider value={overlay}>{children}</OverlayContext.Provider>
        <div ref={setOverlay} className="pointer-events-none absolute inset-0 z-40" />
      </div>
    </div>
  );
}
