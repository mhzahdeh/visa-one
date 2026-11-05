// Toggle.tsx — an accessible switch with a 44 px hit area.
// Off state has a slate outline so the control meets 3:1 non-text contrast.

export function Toggle({
  on,
  onChange,
  label,
  disabled,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={`relative inline-flex h-7 w-12 items-center rounded-full border-2 transition-colors duration-150 ${
          on ? "border-visa-blue bg-visa-blue" : "border-slate bg-surface"
        }`}
      >
        <span
          className={`absolute rounded-full transition-all duration-150 ${
            on ? "left-[22px] h-5 w-5 bg-white" : "left-1 h-4 w-4 bg-slate"
          }`}
        />
      </span>
    </button>
  );
}
