"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useAuthFetch } from "@/lib/useAuthFetch";

export function SubscribeButton({
  tier,
  className,
  children
}: {
  tier: "pro" | "agency";
  className?: string;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [submitting, setSubmitting] = useState(false);

  const handleClick = async () => {
    if (!loading && !user) {
      router.push("/signup");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout.");
      window.location.href = data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not start checkout.");
      setSubmitting(false);
    }
  };

  return (
    <button type="button" onClick={handleClick} disabled={submitting} className={className}>
      {submitting ? "Redirecting…" : children}
    </button>
  );
}
