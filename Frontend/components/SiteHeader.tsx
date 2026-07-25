"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { href: "/articles", label: "Galley Proofs" },
  { href: "/generate", label: "Manuscript Desk" },
  { href: "/pricing", label: "Ledger Rates" },
  { href: "/contact", label: "Contact" }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isHidden, setIsHidden] = useState(pathname === "/");
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);
  const lastScrollYRef = useRef(0);
  const navRef = useRef<HTMLElement>(null);
  const isLanding = pathname === "/";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;
      const delta = currentY - lastY;

      setIsScrolled(currentY > 24);

      if (isLanding) {
        // The landing page navigates via its masthead + sticky ScrollRail;
        // this compact bar would z-fight the rail, so it stays hidden there.
        lastScrollYRef.current = currentY;
        return;
      }

      if (Math.abs(delta) < 6) {
        return;
      }

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

    // Route changed (this component persists across client navigations):
    // recompute visibility from scratch instead of trusting stale state —
    // otherwise a navbar hidden on the landing page stays hidden everywhere.
    lastScrollYRef.current = window.scrollY;
    setIsHidden(isLanding);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isLanding, pathname]);

  // Sliding active-state indicator: measure the active link and glide the
  // underline bar to it via transform.
  useEffect(() => {
    const update = () => {
      const nav = navRef.current;
      const active = nav?.querySelector<HTMLElement>('[data-active="true"]');
      if (!active) {
        setIndicator(null);
        return;
      }
      setIndicator({ x: active.offsetLeft, w: active.offsetWidth });
    };
    update();
    document.fonts?.ready.then(update);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [pathname]);

  // Close the drawer on navigation and on Escape.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
    <header
      className={`${isLanding ? "fixed inset-x-0 top-0" : "sticky top-0"} z-40 border-b-2 border-[var(--ink)] bg-[color-mix(in_srgb,var(--paper)_90%,transparent)] backdrop-blur transition-transform duration-300 ${
        isHidden ? "-translate-y-full" : ""
      }`}
    >
      <div
        className={`mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 transition-[padding] duration-300 ${
          isScrolled ? "py-2" : "py-4"
        }`}
      >
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-none bg-[var(--ink)] text-sm font-mono font-bold text-[var(--paper)] shadow-[2px_2px_0px_var(--accent)] transition group-hover:bg-[var(--accent-deep)]">
            AS
          </span>
          <span className="font-serif">
            <span className="block text-sm font-extrabold uppercase tracking-tight text-[var(--ink)]">
              ArticleShip
            </span>
            <span className="block text-[10px] font-mono text-[var(--ink-muted)] uppercase tracking-wider">Editorial Console</span>
          </span>
        </Link>

        <nav
          ref={navRef}
          aria-label="Primary"
          className="relative hidden items-center gap-2 md:flex font-mono text-xs uppercase tracking-wider"
        >
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active}
                aria-current={active ? "page" : undefined}
                className={`rounded-none px-4 py-2 font-bold transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${
                  active ? "text-[var(--accent)]" : "text-[var(--ink)] hover:text-[var(--accent)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <span
            aria-hidden
            className="absolute bottom-0 left-0 h-[2px] w-px bg-[var(--accent)] transition-[transform,opacity] duration-300"
            style={{
              transformOrigin: "left",
              transform: indicator ? `translateX(${indicator.x}px) scaleX(${indicator.w})` : "scaleX(0)",
              opacity: indicator ? 1 : 0,
              transitionTimingFunction: "var(--ease-press)"
            }}
          />
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* Desktop auth controls */}
          <div className="hidden md:flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
            {user ? (
              <>
                <span className="text-[var(--ink-muted)] max-w-[120px] truncate">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="rounded-none border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] px-3 py-1.5 font-bold text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-none bg-[var(--ink)] px-4 py-2 font-bold text-[var(--paper)] shadow-[2px_2px_0px_var(--accent)] hover:shadow-none transition"
              >
                Sign In
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-label="Open menu"
            className="md:hidden rounded-none border-2 border-[var(--ink)] bg-[var(--plate)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--ink)] shadow-[2px_2px_0px_var(--press-dark)]"
          >
            Menu
          </button>
        </div>
      </div>
    </header>

    {/* Mobile drawer (outside <header>: its backdrop-blur would otherwise
        become the containing block for these fixed elements) */}
      <div
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
        className={`fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--ink)_40%,transparent)] transition-opacity duration-300 md:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={`fixed right-0 top-0 z-50 h-full w-72 border-l-2 border-[var(--ink)] bg-[var(--plate)] p-6 transition-transform duration-300 md:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ transitionTimingFunction: "var(--ease-press)" }}
      >
        <div className="mb-6 flex items-center justify-between border-b-2 border-[var(--ink)] pb-4">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--ink)]">Index</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="rounded-none border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] px-2 py-1 font-mono text-xs font-bold text-[var(--ink)]"
          >
            ✕
          </button>
        </div>
        <nav aria-label="Mobile" className="font-mono text-xs uppercase tracking-wider">
          {[...navItems, user ? null : { href: "/login", label: "Sign In" }]
            .filter((item): item is { href: string; label: string } => item !== null)
            .map((item, i) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-3 font-bold transition-[opacity,transform] duration-300 ${
                    active ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--ink)] hover:text-[var(--accent)]"
                  } ${menuOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"}`}
                  style={{
                    transitionDelay: menuOpen ? `${100 + i * 70}ms` : "0ms",
                    transitionTimingFunction: "var(--ease-press)"
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          {user && (
            <button
              onClick={handleLogout}
              className={`block w-full px-3 py-3 text-left font-bold text-rose-600 transition-[opacity,transform] duration-300 ${
                menuOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
              }`}
              style={{ transitionDelay: menuOpen ? `${100 + navItems.length * 70}ms` : "0ms" }}
            >
              Sign Out
            </button>
          )}
        </nav>
      </div>
    </>
  );
}
