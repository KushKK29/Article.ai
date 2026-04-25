"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type ArticleViewTrackerProps = {
  articleId: string;
};

export default function ArticleViewTracker({ articleId }: ArticleViewTrackerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!articleId) return;

    const storageKey = `articleship:view:${articleId}:${pathname}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(storageKey)) {
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "1");
    }

    void fetch(`/api/articles/${articleId}/track-view`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" }
    }).catch(() => {
      // Tracking failures should not block article rendering.
    });
  }, [articleId, pathname]);

  return null;
}
