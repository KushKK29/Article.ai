/**
 * NOTE FOR USER REVIEW:
 * Please verify/confirm the following details before launch:
 * 1. Founder name: Kush Goel (Line 31)
 * 2. Story details: Frustrations with existing tools (hours wasted on outline generation, robotic content) (Line 36)
 * 3. Pipeline explanation: Keyword clustering, semantic structure outline, deep text generation, captioned plate image sourcing (Line 60)
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Editorial Desk | ArticleShip",
  description: "Learn about the motivations and programmatic pipelines driving ArticleShip's automated typeset."
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] px-6 py-16 md:px-12 font-serif selection:bg-[var(--highlight)] selection:text-[#0B132B]">
      <article className="mx-auto max-w-[800px] space-y-12">
        
        {/* Masthead Header */}
        <header className="border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-8 space-y-3">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--accent)]">Founding Colophon</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Meet Kush Goel</h1>
          <p className="text-sm font-mono uppercase text-[var(--ink-muted)]">
            Founder & Typesetter of ArticleShip
          </p>
        </header>

        {/* Narrative Section */}
        <section className="prose prose-stone prose-md space-y-6 text-[var(--ink)] leading-relaxed">
          <p className="font-serif text-lg italic text-[var(--ink-muted)] pl-4 border-l-2 border-[color-mix(in_srgb,var(--ink)_20%,transparent)]">
            &quot;I didn&apos;t build ArticleShip because I wanted another AI wrapper. I built it because I was exhausted by the friction of publishing technical dispatches.&quot;
          </p>
          
          <p>
            As a developer and technical marketer, content generation always split into two tasks: doing the actual deep research and managing the tedious mechanical typesetting workflow.
          </p>

          <p>
            I faced three distinct frustrations that prompted me to build ArticleShip:
          </p>

          <div className="grid gap-6 md:grid-cols-3 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] pt-4">
            <div className="border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] p-4 bg-[var(--plate)] rounded-xl">
              <span className="font-bold text-[var(--ink)] block mb-1">01. Outline Friction</span>
              Spending hours mapping LSI keywords, search intent variations, and drafting semantic subheadings before writing a single word.
            </div>
            <div className="border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] p-4 bg-[var(--plate)] rounded-xl">
              <span className="font-bold text-[var(--ink)] block mb-1">02. Robotic AI Copy</span>
              Generic AI copywriters generating shallow text stuffed with glowing tech jargon that no engineer would respect.
            </div>
            <div className="border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] p-4 bg-[var(--plate)] rounded-xl">
              <span className="font-bold text-[var(--ink)] block mb-1">03. The Image Surcharge</span>
              Wasting chunks of time searching libraries, downloading plates, resizing images, and formatting captions manually.
            </div>
          </div>

          <h2 className="text-xl font-extrabold pt-6 font-serif">The Programmatic Pipeline (For Agencies & Content Directors)</h2>
          <p>
            For marketing agencies and editorial teams, credibility is paramount. ArticleShip doesn&apos;t just hit an LLM API and dump raw text. Every run goes through an structured five-stage automated pipeline:
          </p>

          <ol className="space-y-4 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] pl-5 list-decimal">
            <li>
              <strong className="text-[var(--ink)]">Keyword & Category Clustering:</strong> We analyze search intent, extracting semantic clusters to group long-tail keywords.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Semantic Structure Design:</strong> An outline is generated detailing all H2, H3, and H4 tags to optimize for readability and query indexing.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Deep Drafting Engine:</strong> Our writing phase crafts high-signal, developer-grade descriptions with code blocks and structural tables.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Plate Image Sourcing:</strong> The pipeline automatically queries Unsplash or Google Custom Search APIs, selecting relevant images and generating captions.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Typesetting & Sanitization:</strong> The output is compiled into sanitized, responsive HTML, formatted for immediate CMS integration.
            </li>
          </ol>

          <p className="pt-4">
            Today, ArticleShip is run by a small team dedicated to maintaining automated typesetting and content excellence. If you manage a content portfolio or marketing agency desk, we invite you to take a seat at our press.
          </p>
        </section>

        {/* Call to Actions */}
        <div className="pt-8 border-t border-[color-mix(in_srgb,var(--ink)_10%,transparent)] flex flex-wrap gap-4">
          <Link 
            href="/generate" 
            className="inline-flex items-center justify-center rounded-none bg-[var(--ink)] text-[var(--paper)] px-6 py-3 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-y-0.5"
          >
            Enter Manuscript Desk
          </Link>
          <Link 
            href="/pricing" 
            className="inline-flex items-center justify-center rounded-none border-2 border-[var(--ink)] bg-[var(--plate)] px-6 py-3 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_var(--ink)] hover:bg-[var(--paper)]"
          >
            Review Ledger Rates
          </Link>
        </div>

      </article>
    </main>
  );
}