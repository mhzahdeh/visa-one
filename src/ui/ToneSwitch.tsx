// ToneSwitch.tsx — under every Sassy shortfall message: "Too much? Switch to Personal".
// One tap changes the tone; the toast offers Undo (new R5, change request 2).

import { useStore } from "../state/store";
import { useToast } from "./Toast";
import { Button } from "./Button";

export function ToneSwitch({ onDark }: { onDark?: boolean }) {
  const { state, setTone } = useStore();
  const toast = useToast();
  if (state.tone !== "Sassy") return null;
  return (
    <Button
      variant={onDark ? "text-on-dark" : "quiet"}
      onClick={() => {
        setTone("Personal");
        toast({ message: "Switched to Personal", actionLabel: "Undo", onAction: () => setTone("Sassy") });
      }}
    >
      Too much? Switch to Personal
    </Button>
  );
}
