"use client";

/**
 * RequireAuth
 * ───────────
 * Wrap any client page component with this to redirect unauthenticated
 * users to /login.
 *
 * Usage:
 *   export default function MyProtectedPage() {
 *     return (
 *       <RequireAuth>
 *         <MyActualContent />
 *       </RequireAuth>
 *     );
 *   }
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)] animate-pulse">
          Verifying credentials…
        </p>
      </div>
    );
  }

  if (!user) return null; // will redirect via useEffect

  return <>{children}</>;
}
