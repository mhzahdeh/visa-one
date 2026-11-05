// setup.ts — test setup. DOM helpers only apply in jsdom test files.

import { MotionGlobalConfig } from "framer-motion";

// Animations finish instantly in tests; real timing is covered in the browser check.
MotionGlobalConfig.skipAnimations = true;

if (typeof window !== "undefined") {
  const reduced = { value: false };
  (globalThis as { __setReducedMotion?: (v: boolean) => void }).__setReducedMotion = (v) => {
    reduced.value = v;
  };
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reduced.value : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  if (!window.HTMLElement.prototype.scrollTo) window.HTMLElement.prototype.scrollTo = () => {};
  if (!window.HTMLElement.prototype.scrollIntoView) window.HTMLElement.prototype.scrollIntoView = () => {};
}
