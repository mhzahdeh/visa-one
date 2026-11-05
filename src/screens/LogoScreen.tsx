// LogoScreen.tsx — only the Visa One logo, centred (#/logo). For slides, videos and
// screenshots. Navy by default with the on-dark logo; #/logo?light gives the blue logo
// on white. No header, tab bar or text.

import { useLocation } from "react-router-dom";
import { Logo } from "../ui/Brand";

export function LogoScreen() {
  const light = new URLSearchParams(useLocation().search).has("light");
  return (
    <div
      data-screen="logo"
      className={`flex h-full w-full items-center justify-center ${light ? "bg-surface" : "bg-hero"}`}
    >
      <Logo variant={light ? "light" : "dark"} height={64} />
    </div>
  );
}
