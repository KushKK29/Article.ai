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
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700 backdrop-blur-sm transition hover:bg-slate-50"
        aria-label="Change theme"
      >
        <div 
          className="h-3 w-3 rounded-full border border-slate-200" 
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
          <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl animate-in fade-in slide-in-from-top-2">
            {themes.map((t) => (
              <button
                key={t.name}
                onClick={() => {
                  setTheme(t.name);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                  theme === t.name 
                    ? "bg-slate-100 text-slate-900" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div 
                  className="h-3 w-3 rounded-full border border-slate-200" 
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
