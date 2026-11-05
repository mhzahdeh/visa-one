// AppHeader.tsx — main-screen header: logo 20 px left, currency chip and avatar right,
// screen title below in 28 px (steering 2.4).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { useStore } from "../state/store";
import { Logo } from "./Brand";
import { ICON } from "./icons";
import { BaseCurrencySheet } from "./BaseCurrencySheet";

export function AppHeader({
  title,
  caption,
  onLogoLongPress,
}: {
  title: string;
  caption?: string;
  onLogoLongPress?: () => void;
}) {
  const { state } = useStore();
  const navigate = useNavigate();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const initial = state.firstName?.trim().charAt(0).toUpperCase();

  return (
    <header className="px-5 pb-4 pt-5">
      <div className="flex h-11 items-center justify-between">
        {/* Clear space around the logo is at least the height of the "one". */}
        <div className="py-1.5">
          <Logo variant="light" height={20} onLongPress={onLogoLongPress} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrencyOpen(true)}
            aria-label={`Base currency ${state.baseCurrency}. Change`}
            className="inline-flex h-11 items-center rounded-full px-1"
          >
            <span className="tabular rounded-full bg-surface px-3 py-1.5 text-caption text-ink shadow-card">
              {state.baseCurrency}
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/control")}
            aria-label="Your profile and controls"
            className="flex h-11 w-11 items-center justify-center rounded-full"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-visa-navy text-label text-white">
              {initial ?? <User size={18} strokeWidth={ICON.stroke} aria-hidden />}
            </span>
          </button>
        </div>
      </div>
      <h1 className="mt-4 text-title text-visa-navy">{title}</h1>
      {caption && <p className="mt-1 text-label font-normal text-slate">{caption}</p>}
      <BaseCurrencySheet open={currencyOpen} onClose={() => setCurrencyOpen(false)} />
    </header>
  );
}
