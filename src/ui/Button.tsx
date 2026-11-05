// Button.tsx — primary, secondary, text and danger-text buttons (steering 2.4).

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant =
  | "primary" // visa-blue, white label, 56 px, full width
  | "secondary" // white with visa-blue label
  | "text" // "See why", "Undo"
  | "text-on-dark" // white text button on navy
  | "danger-text" // the only red in the app: Delete
  | "quiet" // the quiet Cancel in edit sheets
  | "bank"; // the issuer's own button on the Northbank screen (S1)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  /** Full-width buttons are 56 px high; inline ones are 44 px. */
  full?: boolean;
}

const base =
  "inline-flex select-none items-center justify-center gap-2 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40";

const styles: Record<Variant, string> = {
  primary:
    "rounded-button bg-visa-blue px-6 text-body font-semibold text-white active:bg-blue-pressed",
  secondary:
    "rounded-button bg-surface px-6 text-body font-semibold text-visa-blue shadow-card active:bg-blue-tint",
  text: "min-h-11 rounded-input px-1 text-label font-semibold text-visa-blue",
  "text-on-dark": "min-h-11 rounded-input px-1 text-label font-semibold text-white underline decoration-white/40 underline-offset-4",
  "danger-text": "min-h-11 rounded-input px-1 text-label font-semibold text-danger",
  quiet: "min-h-11 rounded-input px-1 text-label font-medium text-slate",
  bank: "rounded-button bg-northbank px-6 text-body font-semibold text-white",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", icon, full, className = "", children, type = "button", ...rest },
  ref
) {
  const isBlock = variant === "primary" || variant === "secondary" || variant === "bank";
  const size = isBlock ? (full ? "h-button w-full" : "h-11") : "";
  return (
    <button
      ref={ref}
      type={type}
      className={`${base} ${styles[variant]} ${size} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

/** Round 44 px icon-only button (back arrow, close). */
export function IconButton({
  label,
  onClick,
  children,
  tone = "light",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ${
        tone === "dark" ? "text-white active:bg-white/10" : "text-ink active:bg-line"
      }`}
    >
      {children}
    </button>
  );
}
