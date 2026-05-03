"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { href: "/articles", label: "All Articles" },
  { href: "/about", label: "About" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/contact", label: "Contact" }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;
      const delta = currentY - lastY;

      // Avoid jitter when scroll movement is tiny.
      if (Math.abs(delta) < 6) {
        return;
      }

      // Always reveal header near the top of the page.
      if (currentY <= 16) {
        setIsHidden(false);
        lastScrollYRef.current = currentY;
        return;
      }

      if (delta > 0 && currentY > 80) {
        setIsHidden(true);
      } else if (delta < 0) {
        setIsHidden(false);
      }

      lastScrollYRef.current = currentY;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur transition-transform duration-300 ${
        isHidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-sm transition group-hover:bg-slate-800">
            KG
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Kush Goel
            </span>
            <span className="block text-sm text-slate-500">Tech & SEO Insights</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${active
                    ? "bg-sky-100 text-sky-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          <details className="relative md:hidden">
            <summary className="list-none rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              Menu
            </summary>
            <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${active ? "bg-emerald-100 text-emerald-900" : "text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}