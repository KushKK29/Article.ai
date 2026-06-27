"use client";

import React from "react";

export default function PrintActions() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center gap-4 border-y border-[#0B132B]/10 py-3 my-8 font-mono text-[10px] font-bold uppercase tracking-wider">
      <button
        type="button"
        onClick={handlePrint}
        className="text-[#1E3A8A] hover:text-[#1D4ED8] transition-colors"
      >
        [ Print Archival Manuscript ]
      </button>
      <span className="text-[#0B132B]/10">|</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(window.location.href);
          alert("Manuscript URL copied to clipboard.");
        }}
        className="text-[#0B132B] hover:text-[#1D4ED8] transition-colors"
      >
        [ Copy Dispatch Link ]
      </button>
    </div>
  );
}
