// Brand.tsx — logo, country flags and issuer card tiles.

import { useRef } from "react";
import type { Card } from "../domain/types";
import { COUNTRY_NAME } from "../domain/types";
import { bankByName, type Bank, type BankTile as BankTileId } from "../data/banks";

const BASE = import.meta.env.BASE_URL;
const LOGO_RATIO = 1495 / 421; // intrinsic size of both logo files

/**
 * The Visa One logo. Never stretched, recoloured or given effects.
 * variant "light" = blue VISA for light backgrounds; "dark" = white VISA for navy.
 */
export function Logo({
  variant,
  height,
  onLongPress,
}: {
  variant: "light" | "dark";
  /** 20 px in headers, 40 px on splash and welcome, larger on the logo-only screen. Always scaled in proportion. */
  height: 20 | 40 | 64;
  onLongPress?: () => void;
}) {
  const timer = useRef<number | null>(null);
  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const src = `${BASE}brand/${variant === "light" ? "VisaOne_logo_transparent.png" : "VisaOne_logo_on-dark.png"}`;
  return (
    <img
      src={src}
      alt="Visa One"
      height={height}
      width={Math.round(height * LOGO_RATIO)}
      // Explicit width: a flex parent must never stretch the logo.
      style={{ height, width: height * LOGO_RATIO }}
      draggable={false}
      className="block max-w-none shrink-0 select-none"
      onPointerDown={
        onLongPress
          ? () => {
              clear();
              timer.current = window.setTimeout(onLongPress, 800);
            }
          : undefined
      }
      onPointerUp={onLongPress ? clear : undefined}
      onPointerLeave={onLongPress ? clear : undefined}
      onContextMenu={onLongPress ? (e) => e.preventDefault() : undefined}
    />
  );
}

const FLAG_FILE: Record<Card["country"], string> = { UK: "gb", ES: "es", NO: "no", FR: "fr", US: "us" };

export function Flag({ country }: { country: Card["country"] }) {
  const file = FLAG_FILE[country];
  return (
    <img
      src={`${BASE}flags/${file}.svg`}
      alt={COUNTRY_NAME[country]}
      width={16}
      height={12}
      className="inline-block h-3 w-4 shrink-0 rounded-[2px] object-cover"
    />
  );
}

const TILE_BG: Record<BankTileId, string> = {
  northbank: "bg-northbank",
  riverside: "bg-riverside",
  solano: "bg-solano",
  nordlys: "bg-nordlys",
  lumiere: "bg-lumiere",
  harbour: "bg-harbour",
};

/** Issuer gradient class for a card. */
function issuerBg(card: Card): string {
  return TILE_BG[bankByName(card.bank)?.tile ?? "northbank"];
}

/** A bank's 40 px logo tile: its gradient and initials (fictional banks, no real logos). */
export function BankTile({ bank }: { bank: Bank }) {
  return (
    <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-input text-label font-semibold text-white ${TILE_BG[bank.tile]}`}>
      {bank.initials}
    </span>
  );
}

/** Card tiles: sm = 40 px row leading, md = 72 x 46 mini card, lg = full card face. */
export function CardTile({ card, size }: { card: Card; size: "sm" | "md" | "lg" }) {
  const bg = issuerBg(card);
  if (size === "sm") {
    return (
      <span aria-hidden className={`flex h-10 w-10 items-end rounded-input p-1.5 ${bg}`}>
        <span className="tabular text-tab text-white">{card.last4}</span>
      </span>
    );
  }
  if (size === "md") {
    return (
      <span aria-hidden className={`flex h-[46px] w-[72px] shrink-0 flex-col justify-between rounded-input p-2 ${bg}`}>
        <span className="h-2 w-3 rounded-[2px] bg-white/40" />
        <span className="tabular text-tab text-white">•• {card.last4}</span>
      </span>
    );
  }
  return (
    <div
      className={`relative flex aspect-[1.586] w-full flex-col justify-between overflow-hidden rounded-card p-5 text-white ${bg}`}
      aria-label={`${card.bank} Visa ${card.type} ending ${card.last4}`}
      role="img"
    >
      <div className="flex items-start justify-between">
        <span className="text-heading">{card.bank}</span>
        <span className="text-caption text-white">Visa {card.type}</span>
      </div>
      <span className="h-7 w-10 rounded-[6px] bg-white/30" aria-hidden />
      <div className="flex items-end justify-between">
        <span className="tabular text-heading">•• {card.last4}</span>
        <span className="flex items-center gap-2 text-label">
          <Flag country={card.country} />
          {card.currency}
        </span>
      </div>
    </div>
  );
}
