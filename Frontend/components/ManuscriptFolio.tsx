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
      <div className="font-mono text-[10px] uppercase tracking-wider text-[color-mix(in_srgb,var(--ink-muted)_60%,transparent)]">
        No section divisions typeset.
      </div>
    );
  }

  return (
    <nav className="space-y-2.5 font-mono text-[10px] uppercase tracking-wider">
      {items.map((item, index) => {
        // Calculate indentation and styling based on header level
        let indentClass = "pl-0 font-bold text-[var(--ink)]";
        let prefix = "§";
        
        if (item.level === 3) {
          indentClass = "pl-4 text-[var(--ink-muted)]";
          prefix = "•";
        } else if (item.level === 4) {
          indentClass = "pl-8 text-[color-mix(in_srgb,var(--ink-muted)_70%,transparent)] text-[9px]";
          prefix = "▪";
        }

        return (
          <a
            key={index}
            href={item.href}
            className={`block hover:text-[var(--accent)] hover:underline transition-colors leading-tight ${indentClass}`}
          >
            <span className="mr-1.5 text-[var(--accent)] font-bold">{prefix}</span>
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
