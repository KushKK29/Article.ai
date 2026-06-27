"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { href: "/articles", label: "Galley Proofs" },
  { href: "/generate", label: "Manuscript Desk" },
  { href: "/privacy-policy", label: "Privacy Policy" },
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
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;
      const delta = currentY - lastY;

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

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Hide the global header completely on the Landing Page
  if (pathname === "/") return null;

  return (
    <header
      className={`sticky top-0 z-40 border-b-2 border-[#0B132B] bg-[#F4F6F9]/90 backdrop-blur transition-transform duration-300 ${
        isHidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-none bg-[#0B132B] text-sm font-mono font-bold text-white shadow-[2px_2px_0px_rgba(29,78,216,1)] transition group-hover:bg-[#1E3A8A]">
            AS
          </span>
          <span className="font-serif">
            <span className="block text-sm font-extrabold uppercase tracking-tight text-[#0B132B]">
              ArticleShip
            </span>
            <span className="block text-[10px] font-mono text-[#4B5563] uppercase tracking-wider">Editorial Console</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-2 md:flex font-mono text-xs uppercase tracking-wider">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-none px-4 py-2 font-bold transition focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] ${active
                    ? "bg-[#0B132B] text-white shadow-[2px_2px_0px_rgba(29,78,216,1)]"
                    : "text-[#0B132B] hover:bg-[#0B132B]/5"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* Desktop auth controls */}
          <div className="hidden md:flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
            {user ? (
              <>
                <span className="text-[#4B5563] max-w-[120px] truncate">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="rounded-none border border-[#0B132B]/30 px-3 py-1.5 font-bold text-[#0B132B] hover:bg-[#0B132B]/5 transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-none bg-[#0B132B] px-4 py-2 font-bold text-white shadow-[2px_2px_0px_rgba(29,78,216,1)] hover:shadow-none transition"
              >
                Sign In
              </Link>
            )}
          </div>

          <details className="relative md:hidden font-mono text-xs uppercase tracking-wider">
            <summary className="list-none rounded-none border-2 border-[#0B132B] bg-white px-4 py-2 font-bold text-[#0B132B] shadow-[2px_2px_0px_rgba(11,19,43,1)] cursor-pointer">
              Menu
            </summary>
            <div className="absolute right-0 mt-3 w-56 rounded-none border-2 border-[#0B132B] bg-white p-2 shadow-[3px_3px_0px_rgba(11,19,43,1)]">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-none px-3 py-2 font-bold transition ${active ? "bg-[#0B132B] text-white" : "text-[#0B132B] hover:bg-slate-50"
                      }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="border-t border-[#0B132B]/10 mt-1 pt-1">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left rounded-none px-3 py-2 font-bold text-rose-700 hover:bg-rose-50 transition"
                  >
                    Sign Out
                  </button>
                ) : (
                  <Link href="/login" className="block rounded-none px-3 py-2 font-bold text-[#1D4ED8] hover:bg-slate-50">
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}