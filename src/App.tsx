import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "./state/store";
import { TabBar } from "./ui/TabBar";
import { useMotion } from "./ui/motion";
import { Onboarding } from "./screens/Onboarding";
import { Home } from "./screens/Home";
import { Habits } from "./screens/Habits";
import { Plan } from "./screens/Plan";
import { Ask } from "./screens/Ask";
import { Control } from "./screens/Control";

export default function App() {
  const { state } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const m = useMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Each tab starts at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo?.(0, 0);
  }, [location.pathname]);

  if (!state.onboarded) {
    return <Onboarding onDone={() => navigate("/home")} />;
  }

  return (
    <>
      <div ref={scrollRef} data-scroll="main" className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden pb-tabbar">
        <motion.div key={location.pathname} {...m.tab}>
          <Routes location={location}>
            <Route path="/home" element={<Home />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/ask" element={<Ask />} />
            <Route path="/control" element={<Control />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </motion.div>
      </div>
      <TabBar current={location.pathname} />
    </>
  );
}
