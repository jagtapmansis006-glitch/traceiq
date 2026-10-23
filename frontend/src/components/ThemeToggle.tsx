import { useTheme, type Mode } from "../theme";

const options: { value: Mode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <div
      role="group"
      aria-label="Theme"
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 2,
        borderRadius: 999,
        border: "1px solid currentColor",
        opacity: 0.95,
      }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setMode(o.value)}
          aria-pressed={mode === o.value}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            color: "inherit",
            background: mode === o.value ? "rgba(128,128,128,0.35)" : "transparent",
            fontWeight: mode === o.value ? 600 : 400,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default ThemeToggle;