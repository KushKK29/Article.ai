"use client";

import { useTheme, type Theme } from "@/lib/ThemeContext";
import { useEffect, useState } from "react";

const themes: { name: Theme; label: string; color: string }[] = [
  { name: "light", label: "Light", color: "#ffffff" },
  { name: "dark", label: "Dark", color: "#0f172a" },
  { name: "midnight", label: "Midnight", color: "#020617" },
  { name: "sepia", label: "Sepia", color: "#fdf6e3" },
  { name: "emerald", label: "Emerald", color: "#f0fdf4" },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-none border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--plate)] px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[var(--ink)] transition hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
        aria-label="Change theme"
      >
        <div
          className="h-3 w-3 rounded-full border border-[color-mix(in_srgb,var(--ink)_30%,transparent)]"
          style={{ backgroundColor: themes.find(t => t.name === theme)?.color }} 
        />
        <span className="hidden sm:inline">Theme</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-none border-2 border-[var(--ink)] bg-[var(--plate)] p-1 shadow-[3px_3px_0px_var(--press-dark)]">
            {themes.map((t) => (
              <button
                key={t.name}
                onClick={() => {
                  setTheme(t.name);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-none px-3 py-2 text-left font-mono text-xs font-bold uppercase tracking-wider transition ${
                  theme === t.name
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
                }`}
              >
                <div
                  className="h-3 w-3 rounded-full border border-[color-mix(in_srgb,var(--ink)_30%,transparent)]"
                  style={{ backgroundColor: t.color }} 
                />
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
