"use client";

import React from "react";

type TableOfContentsItem = {
  label: string;
  href: string;
  level: 2 | 3 | 4;
};

interface ManuscriptFolioProps {
  items: TableOfContentsItem[];
}

export default function ManuscriptFolio({ items }: ManuscriptFolioProps) {
  if (!items || items.length === 0) {
    return (
      <div className="font-mono text-[10px] uppercase tracking-wider text-[#4B5563]/60">
        No section divisions typeset.
      </div>
    );
  }

  return (
    <nav className="space-y-2.5 font-mono text-[10px] uppercase tracking-wider">
      {items.map((item, index) => {
        // Calculate indentation and styling based on header level
        let indentClass = "pl-0 font-bold text-[#0B132B]";
        let prefix = "§";
        
        if (item.level === 3) {
          indentClass = "pl-4 text-[#4B5563]";
          prefix = "•";
        } else if (item.level === 4) {
          indentClass = "pl-8 text-[#4B5563]/70 text-[9px]";
          prefix = "▪";
        }

        return (
          <a
            key={index}
            href={item.href}
            className={`block hover:text-[#1D4ED8] hover:underline transition-colors leading-tight ${indentClass}`}
          >
            <span className="mr-1.5 text-[#1D4ED8] font-bold">{prefix}</span>
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
