/**
 * NOTE FOR USER REVIEW:
 * Please verify/confirm the following mock/preset values before launch:
 * 1. Default current plan: Pro Press ($49/mo) (Line 38)
 * 2. Monthly credit limit: 34 / 50 credits remaining (Line 39)
 * 3. Next billing date: July 27, 2026 (Line 40)
 * 4. Stripe customer portal redirection placeholders (Line 115)
 */

"use client";

import { useState } from "react";
import Link from "next/link";

interface CreditUsageLog {
  id: string;
  topic: string;
  date: string;
  creditsConsumed: number;
}

export default function AccountSettingsPage() {
  const [plan, setPlan] = useState({
    name: "Pro Press",
    price: "$49/mo",
    creditsUsed: 16,
    creditsLimit: 50,
    renewalDate: "2026-07-27"
  });

  const [usageHistory] = useState<CreditUsageLog[]>([
    { id: "1", topic: "Logarithmic complexity analysis in B-Tree Indexes", date: "2026-06-27", creditsConsumed: 1 },
    { id: "2", topic: "Introductory VLSI design and layout rules", date: "2026-06-26", creditsConsumed: 1 },
    { id: "3", topic: "EXIM bank system specifications & syllabus study guides", date: "2026-06-25", creditsConsumed: 1 },
    { id: "4", topic: "Why corporate burnout left me exhausted", date: "2026-06-24", creditsConsumed: 1 },
    { id: "5", topic: "Deploying production apps with LLM reasoning nodes", date: "2026-06-22", creditsConsumed: 1 }
  ]);

  const [paymentMethod] = useState({
    brand: "Visa",
    last4: "4242",
    expiry: "12/28"
  });

  return (
    <main className="min-h-screen bg-[#F4F6F9] text-[#0B132B] px-6 py-16 md:px-12 font-serif selection:bg-[#FEF08A] selection:text-[#0B132B]">
      <div className="mx-auto max-w-[900px] space-y-12">
        
        {/* Header Desk */}
        <header className="border-b border-[#0B132B]/10 pb-8 space-y-3">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#1D4ED8]">Workspace Settings</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Account & Billing Ledger</h1>
          <p className="text-xs font-mono uppercase text-[#4B5563]">
            Manage your subscription desk, inspect credit allotments, and update billing methods.
          </p>
        </header>

        {/* Plan Overview & Credits Card */}
        <div className="grid gap-8 md:grid-cols-[1fr_300px]">
          
          <div className="space-y-8">
            {/* Plan Info */}
            <div className="bg-white border-2 border-[#0B132B] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0px_rgba(11,19,43,0.05)] space-y-6">
              <div className="flex justify-between items-start border-b border-[#0B132B]/10 pb-4">
                <div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#1D4ED8] bg-[#FEF08A] border border-[#0B132B]/20 px-2 py-0.5 inline-block">Active Plan</span>
                  <h2 className="text-2xl font-extrabold mt-2">{plan.name}</h2>
                  <p className="text-xs font-mono uppercase text-[#4B5563] mt-1">{plan.price} • Renews on {new Date(plan.renewalDate).toLocaleDateString()}</p>
                </div>
                <Link 
                  href="/pricing" 
                  className="rounded-none bg-[#0B132B] text-white px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-y-0.5"
                >
                  Change Rate
                </Link>
              </div>

              {/* Credit Meter */}
              <div className="space-y-3">
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider font-bold">
                  <span>Manuscript Run Balance</span>
                  <span>{plan.creditsLimit - plan.creditsUsed} / {plan.creditsLimit} Runs Remaining</span>
                </div>
                {/* Visual Ledger Progress Bar */}
                <div className="w-full bg-[#F4F6F9] border border-[#0B132B]/25 h-4 p-[2px]">
                  <div 
                    className="bg-[#1D4ED8] h-full transition-all"
                    style={{ width: `${((plan.creditsLimit - plan.creditsUsed) / plan.creditsLimit) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#4B5563] leading-relaxed">
                  Your monthly quota resets to {plan.creditsLimit} runs on {new Date(plan.renewalDate).toLocaleDateString()}. Unused runs do not roll over.
                </p>
              </div>
            </div>

            {/* Credit Ledger History */}
            <div className="bg-white border-2 border-[#0B132B] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0px_rgba(11,19,43,0.05)] space-y-4">
              <h3 className="text-lg font-extrabold border-b border-[#0B132B]/10 pb-2">Manuscript Run Registry</h3>
              <div className="divide-y divide-[#0B132B]/10 font-mono text-[10px] uppercase tracking-wider text-[#4B5563]">
                {usageHistory.map((log) => (
                  <div key={log.id} className="py-3 flex justify-between items-center gap-4">
                    <div className="truncate">
                      <span className="text-[#0B132B] font-bold block truncate">{log.topic}</span>
                      <span className="text-[9px] text-[#4B5563]/60">{log.date}</span>
                    </div>
                    <span className="font-bold text-[#1D4ED8] flex-shrink-0">-{log.creditsConsumed} Run</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Method Panel */}
          <aside className="space-y-6">
            <div className="bg-white border-2 border-[#0B132B] rounded-2xl p-6 shadow-[3px_3px_0px_rgba(11,19,43,0.05)] space-y-4">
              <h3 className="text-sm font-extrabold font-serif border-b border-[#0B132B]/10 pb-2">Payment Method</h3>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#4B5563] space-y-2">
                <div className="flex justify-between items-center bg-[#F4F6F9] border border-[#0B132B]/10 p-3">
                  <span>{paymentMethod.brand} •••• {paymentMethod.last4}</span>
                  <span className="text-[9px] text-[#4B5563]/60">Exp: {paymentMethod.expiry}</span>
                </div>
                <button 
                  onClick={() => alert("Redirecting to secured payment gateway portal...")}
                  className="w-full text-center py-2.5 bg-white border border-[#0B132B] text-[#0B132B] font-bold hover:bg-[#F4F6F9] transition-all"
                >
                  Update Card
                </button>
              </div>
            </div>

            <div className="bg-white border-2 border-rose-800 rounded-2xl p-6 shadow-[3px_3px_0px_rgba(225,29,72,0.03)] space-y-4">
              <h3 className="text-sm font-extrabold text-rose-800 border-b border-rose-800/10 pb-2">Decommission Desk</h3>
              <p className="font-serif text-[11px] text-[#4B5563] leading-relaxed">
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
