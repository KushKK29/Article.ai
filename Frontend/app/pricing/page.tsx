/**
 * NOTE FOR USER REVIEW:
 * Please verify/confirm the following values before launch:
 * 1. Free Tier limit: 3 articles/month (Line 38)
 * 2. Pro Tier price and limit: $49/month, 50 articles/month (Line 46)
 * 3. Agency Tier price and limit: $149/month, 200 articles/month (Line 55)
 * 4. Refund policy: 14-day refund window, provided <5 articles were generated (Line 146)
 * 5. Credit policy: Failed runs do not consume credits (Line 137)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Subscription Rates | ArticleShip Editorial Desk",
  description: "Browse rates for professional, high-volume automated manuscript composition and publishing tools."
};

export default function PricingPage() {
  const tiers = [
    {
      name: "Free Sheet",
      price: "$0",
      description: "For solo authors establishing their digital journal archives.",
      features: [
        "3 completed articles per month",
        "Standard outline & keyword generation",
        "Standard Unsplash image library plate Sourcing",
        "Single seat editorial workspace"
      ],
      buttonText: "Register Free Desk",
      buttonLink: "/generate",
      primary: false
    },
    {
      name: "Pro Press",
      price: "$49",
      period: "/month",
      description: "Our recommended tier for active publishers and content directors.",
      features: [
        "50 completed articles per month",
        "Google Custom Search API image plate Sourcing",
        "Scheduled & Staggered batch runs",
        "Google Gemini premium output quality",
        "Full Editor Workbench access",
        "14-day refund window guarantee"
      ],
      buttonText: "Subscribe to Pro Desk",
      buttonLink: "/generate",
      primary: true
    },
    {
      name: "Agency Master",
      price: "$149",
      period: "/month",
      description: "For high-volume editorial rooms, agencies, and multi-author syndicates.",
      features: [
        "200 completed articles per month",
        "Priority generation queue (3x speed)",
        "Up to 5 shared seat workspaces",
        "Advanced SEO keyword clusters",
        "Dedicated API workspace hooks",
        "Direct email integration assistance"
      ],
      buttonText: "Engage Agency Desk",
      buttonLink: "/generate",
      primary: false
    }
  ];

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] px-6 py-16 md:px-12 font-serif selection:bg-[var(--highlight)] selection:text-[var(--ink)]">
      <div className="mx-auto max-w-[1100px] space-y-16">
        
        {/* Masthead Header */}
        <header className="text-center space-y-4 max-w-2xl mx-auto border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-10">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--accent)]">Subscription Rates</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[var(--ink)]">
            The Litho Press Ledger
          </h1>
          <p className="text-sm font-mono uppercase text-[var(--ink-muted)] leading-relaxed">
            Choose your composition rate. Simple, predictable billing for modern editorial offices.
          </p>
        </header>

        {/* Pricing Cards Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier, i) => {
            const cardBg = tier.primary ? "bg-[var(--plate)] border-2 border-[var(--accent)] shadow-[4px_4px_0px_var(--accent)]" : "bg-[var(--plate)] border-2 border-[var(--ink)] shadow-[3px_3px_0px_var(--press-dark)]";
            const btnStyle = tier.primary
              ? "bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--accent)] shadow-[3px_3px_0px_var(--accent)]"
              : "bg-[var(--plate)] text-[var(--ink)] border-2 border-[var(--ink)] hover:bg-[var(--paper)] shadow-[2px_2px_0px_var(--ink)]";

            return (
              <Reveal key={tier.name} delay={i * 110}>
              <div className={`ink-frame press-lift relative flex h-full flex-col justify-between p-8 rounded-none ${cardBg}`}>
                {tier.primary && (
                  <span className="stamp absolute -top-3 right-6 bg-[var(--highlight)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0B132B]">
                    Recommended
                  </span>
                )}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-extrabold">{tier.name}</h3>
                    <p className="text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mt-2">{tier.description}</p>
                  </div>

                  <div className="py-4 border-y border-[color-mix(in_srgb,var(--ink)_10%,transparent)] flex items-baseline">
                    <span className="text-4xl md:text-5xl font-extrabold tracking-tight">{tier.price}</span>
                    {tier.period && <span className="font-mono text-xs uppercase text-[var(--ink-muted)] ml-1">{tier.period}</span>}
                  </div>

                  <ul className="space-y-3 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="text-[var(--accent)]">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-[color-mix(in_srgb,var(--ink)_10%,transparent)]">
                  <Link
                    href={tier.buttonLink}
                    className={`w-full block text-center py-3 text-xs font-mono font-bold uppercase tracking-wider rounded-none transition-all active:translate-y-0.5 ${btnStyle}`}
                  >
                    {tier.buttonText}
                  </Link>
                </div>
              </div>
              </Reveal>
            );
          })}
        </div>

        {/* Ledger & Credit Policy */}
        <section className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-none p-8 shadow-[3px_3px_0px_var(--press-dark)] space-y-6">
          <h2 className="text-xl font-extrabold border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-3">Credit Ledger Mechanics</h2>
          <div className="grid gap-6 md:grid-cols-2 font-serif text-sm text-[var(--ink)]">
            <div className="space-y-2">
              <h3 className="font-mono text-xs uppercase font-bold text-[var(--accent)]">What is a &quot;Manuscript Run&quot;?</h3>
              <p className="leading-relaxed">
                One manuscript run represents a single completed article composed by the AI engine, complete with SEO keyword arrays, section headings, high-context body copy, and curated license-compliant image plates.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-mono text-xs uppercase font-bold text-[var(--accent)]">How are runs consumed?</h3>
              <p className="leading-relaxed">
                A credit is consumed only when a manuscript completes and is saved in your digital archives. If the generation fails partway through or is suspended for editing before successful completion, no credit is deducted. For batch processes, credits are charged per successfully finished article.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-extrabold text-center">Billing & Rates FAQ</h2>
          <div className="grid gap-6 md:grid-cols-2">
            
            <div className="bg-[var(--plate)] border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] p-6 rounded-none shadow-[3px_3px_0px_var(--press-dark)] space-y-2">
              <h3 className="text-base font-extrabold">Can I request a refund if I am dissatisfied?</h3>
              <p className="font-serif text-xs text-[var(--ink-muted)] leading-relaxed">
                Yes. We offer a full 14-day refund window on Pro and Agency plans, provided that you have run fewer than 5 manuscript compilations during that time. Contact our support desk to submit a refund petition.
              </p>
            </div>

            <div className="bg-[var(--plate)] border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] p-6 rounded-none shadow-[3px_3px_0px_var(--press-dark)] space-y-2">
              <h3 className="text-base font-extrabold">What happens to my unused credits?</h3>
              <p className="font-serif text-xs text-[var(--ink-muted)] leading-relaxed">
                To maintain predictable server reservation capacities, standard plan credits reset at the end of each monthly cycle. Unused monthly runs do not roll over to the subsequent billing cycle.
              </p>
            </div>

            <div className="bg-[var(--plate)] border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] p-6 rounded-none shadow-[3px_3px_0px_var(--press-dark)] space-y-2">
              <h3 className="text-base font-extrabold">Can I downgrade my desk mid-cycle?</h3>
              <p className="font-serif text-xs text-[var(--ink-muted)] leading-relaxed">
                Yes. When you downgrade, your current tier limits remain available until the end of your paid billing period, at which point your account will adjust to the new quota limits.
              </p>
            </div>

            <div className="bg-[var(--plate)] border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] p-6 rounded-none shadow-[3px_3px_0px_var(--press-dark)] space-y-2">
              <h3 className="text-base font-extrabold">Are there hidden server API surcharge costs?</h3>
              <p className="font-serif text-xs text-[var(--ink-muted)] leading-relaxed">
                No. All outbound calls to Google Gemini and image search engines are bundled directly inside your subscription tier. You will never receive an additional bill for API usage spikes.
              </p>
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}
