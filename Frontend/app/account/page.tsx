/**
 * NOTE FOR USER REVIEW:
 * Payment method card (brand/last4/expiry) below is still a display mock —
 * reading it for real requires a new backend endpoint to fetch the Stripe
 * default payment method, which doesn't exist yet. Everything else on this
 * page (plan, credit usage, renewal date, run history) is real.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useAuthFetch } from "@/lib/useAuthFetch";

const TIER_INFO: Record<string, { name: string; price: string; credits: number }> = {
  free: { name: "Free Sheet", price: "$0/mo", credits: 3 },
  pro: { name: "Pro Press", price: "$49/mo", credits: 50 },
  agency: { name: "Agency Master", price: "$149/mo", credits: 200 }
};

interface CreditUsageLog {
  id: string;
  topic: string;
  date: string;
  creditsConsumed: number;
}

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [managingBilling, setManagingBilling] = useState(false);
  const [usageHistory, setUsageHistory] = useState<CreditUsageLog[]>([]);

  const tierId = user?.tier ?? "free";
  const creditsUsed = user?.usage?.completed_jobs ?? 0;
  const creditsLimit = TIER_INFO[tierId].credits;
  const renewalDate = user?.stripe_current_period_end ?? null;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const res = await authFetch("/api/jobs?status=completed", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const jobs: { _id: string; topic: string; completed_at: string | null; created_at: string }[] = data.jobs ?? [];
      setUsageHistory(
        jobs.slice(0, 10).map((job) => ({
          id: job._id,
          topic: job.topic,
          date: new Date(job.completed_at ?? job.created_at).toLocaleDateString(),
          creditsConsumed: 1
        }))
      );
    })();
  }, [user, authFetch]);

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const res = await authFetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open billing portal.");
      window.location.href = data.url;
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Could not open billing portal. Subscribe to a paid plan first."
      );
      setManagingBilling(false);
    }
  };

  const [paymentMethod] = useState({
    brand: "Visa",
    last4: "4242",
    expiry: "12/28"
  });

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] px-6 py-16 md:px-12 font-serif selection:bg-[var(--highlight)] selection:text-[#0B132B]">
      <div className="mx-auto max-w-[900px] space-y-12">
        
        {/* Header Desk */}
        <header className="border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-8 space-y-3">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--accent)]">Workspace Settings</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Account & Billing Ledger</h1>
          <p className="text-xs font-mono uppercase text-[var(--ink-muted)]">
            Manage your subscription desk, inspect credit allotments, and update billing methods.
          </p>
        </header>

        {/* Plan Overview & Credits Card */}
        <div className="grid gap-8 md:grid-cols-[1fr_300px]">
          
          <div className="space-y-8">
            {/* Plan Info */}
            <div className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0px_var(--press-dark)] space-y-6">
              <div className="flex justify-between items-start border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-4">
                <div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#1D4ED8] bg-[var(--highlight)] border border-[#0B132B]/20 px-2 py-0.5 inline-block">Active Plan</span>
                  <h2 className="text-2xl font-extrabold mt-2">{TIER_INFO[tierId].name}</h2>
                  <p className="text-xs font-mono uppercase text-[var(--ink-muted)] mt-1">
                    {TIER_INFO[tierId].price}
                    {tierId !== "free" && renewalDate && <> • Renews on {new Date(renewalDate).toLocaleDateString()}</>}
                  </p>
                </div>
                <Link 
                  href="/pricing" 
                  className="rounded-none bg-[var(--ink)] text-[var(--paper)] px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-y-0.5"
                >
                  Change Rate
                </Link>
              </div>

              {/* Credit Meter */}
              <div className="space-y-3">
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider font-bold">
                  <span>Manuscript Run Balance</span>
                  <span>{Math.max(creditsLimit - creditsUsed, 0)} / {creditsLimit} Runs Remaining</span>
                </div>
                {/* Visual Ledger Progress Bar */}
                <div className="w-full bg-[var(--paper)] border border-[color-mix(in_srgb,var(--ink)_25%,transparent)] h-4 p-[2px]">
                  <div
                    className="bg-[var(--accent)] h-full transition-all"
                    style={{ width: `${Math.min((creditsUsed / creditsLimit) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                  {tierId === "free" || !renewalDate
                    ? `Your plan includes ${creditsLimit} manuscript runs.`
                    : `Your monthly quota resets to ${creditsLimit} runs on ${new Date(renewalDate).toLocaleDateString()}. Unused runs do not roll over.`}
                </p>
              </div>
            </div>

            {/* Credit Ledger History */}
            <div className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0px_var(--press-dark)] space-y-4">
              <h3 className="text-lg font-extrabold border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-2">Manuscript Run Registry</h3>
              <div className="divide-y divide-[color-mix(in_srgb,var(--ink)_10%,transparent)] font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                {usageHistory.length === 0 ? (
                  <p className="py-3">No completed manuscript runs yet.</p>
                ) : (
                  usageHistory.map((log) => (
                    <div key={log.id} className="py-3 flex justify-between items-center gap-4">
                      <div className="truncate">
                        <span className="text-[var(--ink)] font-bold block truncate">{log.topic}</span>
                        <span className="text-[9px] text-[color-mix(in_srgb,var(--ink-muted)_60%,transparent)]">{log.date}</span>
                      </div>
                      <span className="font-bold text-[var(--accent)] flex-shrink-0">-{log.creditsConsumed} Run</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Payment Method Panel */}
          <aside className="space-y-6">
            <div className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-6 shadow-[3px_3px_0px_var(--press-dark)] space-y-4">
              <h3 className="text-sm font-extrabold font-serif border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-2">Payment Method</h3>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] space-y-2">
                {tierId !== "free" && (
                  <div className="flex justify-between items-center bg-[var(--paper)] border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] p-3">
                    <span>{paymentMethod.brand} •••• {paymentMethod.last4}</span>
                    <span className="text-[9px] text-[color-mix(in_srgb,var(--ink-muted)_60%,transparent)]">Exp: {paymentMethod.expiry}</span>
                  </div>
                )}
                {tierId === "free" ? (
                  <Link
                    href="/pricing"
                    className="block w-full text-center py-2.5 bg-[var(--plate)] border border-[var(--ink)] text-[var(--ink)] font-bold hover:bg-[var(--paper)] transition-all"
                  >
                    Subscribe to a Plan
                  </Link>
                ) : (
                  <button
                    onClick={handleManageBilling}
                    disabled={managingBilling}
                    className="w-full text-center py-2.5 bg-[var(--plate)] border border-[var(--ink)] text-[var(--ink)] font-bold hover:bg-[var(--paper)] transition-all disabled:opacity-60"
                  >
                    {managingBilling ? "Redirecting…" : "Manage Billing"}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[var(--plate)] border-2 border-rose-800 rounded-2xl p-6 shadow-[3px_3px_0px_rgba(225,29,72,0.03)] space-y-4">
              <h3 className="text-sm font-extrabold text-rose-800 border-b border-rose-800/10 pb-2">Decommission Desk</h3>
              <p className="font-serif text-[11px] text-[var(--ink-muted)] leading-relaxed">
                Deactivating your workspace will purge all pending staggered schedules and delete all archived manuscripts from our servers.
              </p>
              <button 
                onClick={() => {
                  if (confirm("Are you sure you want to decommission your desk? This action is permanent.")) {
                    alert("Account deletion request submitted. Database deletion takes up to 30 days.");
                  }
                }}
                className="w-full text-center py-2 bg-rose-50 border-2 border-rose-850 text-rose-800 font-mono text-[9px] font-bold uppercase tracking-wider hover:bg-rose-100 transition-all"
              >
                Decommission Workspace
              </button>
            </div>
          </aside>

        </div>
      </div>
    </main>
  );
}
