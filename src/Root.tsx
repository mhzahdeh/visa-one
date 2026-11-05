// Root.tsx — providers shared by the app and the UI tests.

import { HashRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { StoreProvider } from "./state/store";
import { PhoneFrame } from "./ui/PhoneFrame";
import { ToastProvider } from "./ui/Toast";

export function Root() {
  return (
    <HashRouter>
      <StoreProvider>
        <MotionConfig reducedMotion="user">
          <PhoneFrame>
            <ToastProvider>
              <App />
            </ToastProvider>
          </PhoneFrame>
        </MotionConfig>
      </StoreProvider>
    </HashRouter>
  );
}
