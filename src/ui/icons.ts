// icons.ts — lucide-react only, 1.75 stroke, 20 or 24 px (steering 2.4).

import {
  CircleDot,
  Coffee,
  Repeat,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Bus,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { SpendCategory } from "../domain/types";

export const ICON = { stroke: 1.75, sm: 20, md: 24 } as const;

export const CATEGORY_ICON: Record<SpendCategory | "All", LucideIcon> = {
  All: Wallet,
  Takeaways: UtensilsCrossed,
  Groceries: ShoppingBasket,
  Transport: Bus,
  Clothes: Shirt,
  Subscriptions: Repeat,
  Beauty: Sparkles,
  "Eating out": Coffee,
  Other: CircleDot,
};
