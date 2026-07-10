"use client";

import React from "react";

export default function PrintActions() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center gap-4 border-y border-[color-mix(in_srgb,var(--ink)_10%,transparent)] py-3 my-8 font-mono text-[10px] font-bold uppercase tracking-wider">
      <button
        type="button"
        onClick={handlePrint}
        className="text-[var(--accent-deep)] hover:text-[var(--accent)] transition-colors"
      >
        [ Print Archival Manuscript ]
      </button>
      <span className="text-[color-mix(in_srgb,var(--ink)_10%,transparent)]">|</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(window.location.href);
          alert("Manuscript URL copied to clipboard.");
        }}
        className="text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
      >
        [ Copy Dispatch Link ]
      </button>
    </div>
  );
}
