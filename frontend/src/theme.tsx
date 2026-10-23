import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Mode = "light" | "dark" | "system";
export type Resolved = "light" | "dark";

type Ctx = {
  mode: Mode;
  setMode: (m: Mode) => void;
  resolved: Resolved;
  theme: Mode;
  setTheme: (m: Mode) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

const getSystem = (): Resolved =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    try {
      return (localStorage.getItem("theme") as Mode) || "system";
    } catch {
      return "system";
    }
  });
  const [system, setSystem] = useState<Resolved>(getSystem);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved: Resolved = mode === "system" ? system : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.setAttribute("data-theme", resolved);
    root.style.colorScheme = resolved;
    try {
      localStorage.setItem("theme", mode);
    } catch {}
  }, [mode, resolved]);

  return (
    <ThemeContext.Provider
      value={{ mode, setMode, resolved, theme: mode, setTheme: setMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}