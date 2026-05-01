"use client";

import { useEffect } from "react";

/**
 * CitationBadgeEnhancer
 *
 * Legacy cleanup for old articles stored with [SOURCE: ...] badge format.
 * Replaces the entire <sup class="citation-badge"> element with a clean
 * inline <a> link — matching the new Wikipedia-style inline citation format.
 *
 * New articles already emit [anchor text](url) markdown → plain <a> tags.
 * This component is a no-op on those.
 */
export default function CitationBadgeEnhancer() {
  useEffect(() => {
    const badges = document.querySelectorAll<HTMLElement>(".citation-badge");

    badges.forEach((badge) => {
      const label = badge.getAttribute("title") || badge.textContent || "";

      // Extract URL from title attribute
      const urlMatch = label.match(/https?:\/\/\S+/);
      const url = urlMatch ? urlMatch[0].replace(/[.,)">]+$/, "") : "";

      // Extract institution name (before first " — ")
      const parts = label.split(/\s+[—–-]{1,2}\s+/);
      let display = parts[0]?.trim() || label;
      if (display.length > 60) display = display.slice(0, 57).trimEnd() + "…";

      // Build replacement inline element
      const replacement = document.createElement(url ? "a" : "span");
      replacement.textContent = display;
      replacement.className = "article-link citation-inline";

      if (url && replacement instanceof HTMLAnchorElement) {
        replacement.href = url;
        replacement.target = "_blank";
        replacement.rel = "noopener noreferrer";
      }

      // Replace the <sup> with the inline element (no superscript, no badge)
      badge.parentNode?.replaceChild(replacement, badge);
    });
  }, []);

  return null;
}
