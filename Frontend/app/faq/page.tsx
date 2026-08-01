/**
 * NOTE FOR USER REVIEW:
 * Please verify/confirm the following details before launch:
 * 1. Image Licensing: Sourced from Unsplash and Google Search
 * 2. Uniqueness guarantee: No automated plagiarism verification in app; users advised to run scans
 * 3. Scheduling support: Stagger scheduler available on Pro and Agency tiers
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | ArticleShip Registry",
  description: "Read about manuscript compilation, editing, scheduling, and licensing terms on ArticleShip."
};

export default function FAQPage() {
  const faqs = [
    {
      q: "Can I edit the article before it publishes?",
      a: "Yes. Once a manuscript run completes, it is saved to your local workspace archives. You can open it in the Editor Desk workbench to modify headings, rewrite paragraphs, re-order sections, or swap image plates before pushing it live."
    },
    {
      q: "Where do the images come from and are they licensed for commercial use?",
      a: "Images are fetched from Unsplash under the Unsplash License, or via the Google Custom Search API. The plates sourced from Unsplash are fully authorized for commercial editorial use. For plates fetched via Google Search, we recommend verifying the licensing of the target site before final publication."
    },
    {
      q: "What happens if a manuscript generation fails partway through?",
      a: "Our pipeline monitor tracks active compositing. If an LLM timeout, database disconnect, or API failure occurs, the run status will update to 'Suspended'. Failed runs are auto-credited back to your account registry, ensuring you only pay for completed articles."
    },
    {
      q: "Can I schedule multiple articles to generate at once?",
      a: "Yes. Premium desks (Pro Press and Agency Master) can schedule staggered runs. You can input multiple topics, configure a stagger interval (e.g. compile one article every 12 hours), and let the automated press run in the background."
    },
    {
      q: "Is the content unique / will it pass plagiarism checkers?",
      a: "Every manuscript is composed dynamically from scratch using Google Gemini models using custom editorial prompt templates. While they pass standard copyright checks, we always recommend running drafts through plagiarism checkers (like CopyScape) as a standard publishing precaution."
    },
    {
      q: "Can I export my articles to WordPress or other platforms?",
      a: "Yes. Completed manuscripts can be exported as sanitized HTML payloads or standard Markdown. You can easily copy and paste them directly into WordPress, Webflow, Ghost, or any other CMS editor."
    }
  ];

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] px-6 py-16 md:px-12 font-serif selection:bg-[var(--highlight)] selection:text-[#0B132B]">
      <div className="mx-auto max-w-[800px] space-y-12">
        
        {/* Header Block */}
        <header className="border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-8 space-y-3">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--accent)]">Inquiry Desk</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Frequently Asked Questions</h1>
          <p className="text-xs font-mono uppercase text-[var(--ink-muted)]">
            Find quick details about manuscript composition, billing, and system specifications.
          </p>
        </header>

        {/* FAQs Grid */}
        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-6 shadow-[3px_3px_0px_var(--press-dark)] space-y-3"
            >
              <h3 className="text-lg font-extrabold font-serif flex gap-2 items-start text-[var(--ink)]">
                <span className="font-mono text-xs text-[#1D4ED8] bg-[var(--highlight)] px-1.5 py-0.5 border border-[#0B132B]/10">Q</span>
                <span>{faq.q}</span>
              </h3>
              <p className="font-serif text-sm text-[var(--ink-muted)] leading-relaxed pl-8">
                {faq.a}
              </p>
            </div>
          ))}
        </div>

        {/* Help Banner */}
        <div className="bg-[var(--plate)] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_30%,transparent)] p-8 text-center rounded-2xl space-y-4">
          <h3 className="text-lg font-extrabold">Have a question not listed in the ledger?</h3>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
            Our support desk is standing by to assist with custom requests.
          </p>
          <Link 
            href="/contact" 
            className="inline-flex items-center justify-center rounded-none bg-[var(--ink)] text-[var(--paper)] px-6 py-3 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-y-0.5"
          >
            Submit Support Inquiry
          </Link>
        </div>

      </div>
    </main>
  );
}
