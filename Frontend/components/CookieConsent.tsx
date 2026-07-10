"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  const decide = (value: "accepted" | "declined") => {
    localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 md:px-6 md:pb-6">
      <div className="mx-auto max-w-3xl border-2 border-[var(--ink)] bg-[var(--plate)] p-5 shadow-[4px_4px_0px_var(--ink)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
              Cookie Notice
            </p>
            <p className="text-sm leading-relaxed text-[var(--ink)]">
              We use essential cookies to keep you signed in, plus optional cookies to
              understand how the desk is used. See our{" "}
              <Link href="/privacy-policy" className="underline hover:text-[var(--accent)]">
                Privacy Policy
              </Link>{" "}
              for details.
            </p>
          </div>

          <div className="flex flex-shrink-0 gap-3">
            <button
              onClick={() => decide("declined")}
              className="flex-1 whitespace-nowrap border border-[var(--ink)] bg-[var(--plate)] px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--ink)] transition-all hover:bg-[var(--paper)] md:flex-none"
            >
              Decline
            </button>
            <button
              onClick={() => decide("accepted")}
              className="flex-1 whitespace-nowrap bg-[var(--ink)] px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--paper)] shadow-[2px_2px_0px_rgba(29,78,216,1)] transition-all hover:shadow-none active:translate-y-0.5 md:flex-none"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
