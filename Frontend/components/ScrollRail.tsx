"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sticky section navigation for the landing page: anchor links that
 * highlight the section in view, plus an ink-line progress bar that
 * draws across the rail as the reader scrolls the page.
 */
export default function ScrollRail({
  sections
}: {
  sections: { id: string; label: string }[];
}) {
  const [active, setActive] = useState<string>("");
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Progress bar: rAF-throttled scroll listener writing a transform only.
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        const p = max > 0 ? doc.scrollTop / max : 0;
        if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Active section: observe each target, latest one crossing the top band wins.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [sections]);

  return (
    <nav
      aria-label="Page sections"
      className="sticky top-0 z-40 border-b-2 border-[var(--ink)] bg-[var(--paper)]"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 overflow-x-auto px-6 py-2.5 font-mono text-[11px] uppercase tracking-widest">
        <span className="hidden shrink-0 font-bold text-[var(--ink-muted)] sm:inline">
          On this sheet —
        </span>
        <div className="flex items-center gap-5 sm:gap-7">
          {sections.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`whitespace-nowrap border-b-2 pb-0.5 transition-colors duration-200 ${
                active === id
                  ? "border-[var(--accent)] font-bold text-[var(--accent)]"
                  : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
      {/* Ink progress line: draws left → right as the page is read */}
      <div
        ref={barRef}
        aria-hidden
        className="h-[3px] origin-left bg-[var(--accent)]"
        style={{ transform: "scaleX(0)" }}
      />
    </nav>
  );
}
