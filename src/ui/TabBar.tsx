// TabBar.tsx — floating bottom tab bar: 12 px above the bottom, 64 px high,
// white at 85 percent with backdrop blur, 24 px radius (steering 2.4).

import { Link } from "react-router-dom";
import { ChartNoAxesColumn, Home, MessageCircle, ShieldCheck, Target } from "lucide-react";
import { ICON } from "./icons";

const TABS = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/habits", label: "Habits", Icon: ChartNoAxesColumn },
  { to: "/plan", label: "Plan", Icon: Target },
  { to: "/ask", label: "Ask", Icon: MessageCircle },
  { to: "/control", label: "Control", Icon: ShieldCheck },
];

export function TabBar({ current }: { current: string }) {
  return (
    <nav aria-label="Main" className="pointer-events-none absolute inset-x-0 bottom-3 z-30 px-3">
      <div className="pointer-events-auto mx-auto flex h-16 items-stretch rounded-tabbar bg-white/85 shadow-float backdrop-blur-xl">
        {TABS.map(({ to, label, Icon }) => {
          const active = current.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-0.5"
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150 ${
                  active ? "bg-blue-tint text-visa-blue" : "text-slate"
                }`}
              >
                <Icon size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden />
              </span>
              <span className={`text-tab ${active ? "font-semibold text-visa-blue" : "text-slate"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
