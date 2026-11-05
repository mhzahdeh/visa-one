import type { Config } from "tailwindcss";
import { gradients, tailwindColors } from "./src/ui/tokens";

// The theme REPLACES Tailwind's default colours and type scale, so only design
// tokens can be used (steering: .kiro/steering/design.md).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    colors: tailwindColors,
    fontFamily: {
      sans: ["Inter", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
    },
    fontSize: {
      display: ["40px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "700" }],
      title: ["28px", { lineHeight: "34px", letterSpacing: "-0.01em", fontWeight: "600" }],
      heading: ["20px", { lineHeight: "26px", fontWeight: "600" }],
      body: ["16px", { lineHeight: "24px" }],
      label: ["14px", { lineHeight: "20px", fontWeight: "500" }],
      caption: ["12px", { lineHeight: "16px", fontWeight: "500" }],
      tab: ["11px", { lineHeight: "14px", fontWeight: "500" }],
    },
    extend: {
      borderRadius: {
        card: "20px",
        button: "14px",
        input: "12px",
        sheet: "24px",
        tabbar: "24px",
        icon: "22%",
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,16,72,0.04), 0 8px 24px rgba(11,16,72,0.06)",
        float: "0 2px 6px rgba(11,16,72,0.06), 0 12px 32px rgba(11,16,72,0.12)",
        focus: "0 0 0 3px rgba(20,52,203,0.35)",
      },
      backgroundImage: {
        hero: gradients.hero,
        northbank: gradients.northbank,
        riverside: gradients.riverside,
        solano: gradients.solano,
        nordlys: gradients.nordlys,
        lumiere: gradients.lumiere,
        harbour: gradients.harbour,
        shimmer: gradients.shimmer,
      },
      spacing: {
        gutter: "20px",
        tabbar: "88px", // 64 px bar + 12 px float + 12 px breathing room
        row: "64px",
        button: "56px",
      },
      letterSpacing: {
        caps: "0.06em",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
      transitionDuration: {
        150: "150ms",
      },
    },
  },
  plugins: [],
} satisfies Config;
