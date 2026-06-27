"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#0B132B] selection:bg-[#FEF08A] selection:text-[#0B132B] font-serif transition-colors duration-300">
      
      {/* ── Masthead Header ── */}
      <header className="border-b-2 border-[#0B132B]">
        <div className="mx-auto max-w-7xl px-6 py-6 md:py-8 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
          <div className="text-left font-mono text-xs uppercase tracking-widest text-[#4B5563]">
            EST. 2026 / VOL. IV NO. I
          </div>
          <div className="text-center">
            <Link href="/" className="inline-block text-3xl font-extrabold tracking-tighter text-[#0B132B] uppercase hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:ring-offset-2">
              ArticleShip
            </Link>
          </div>
          <div className="text-right hidden md:block">
            <Link 
              href="/generate" 
              className="inline-block rounded-none bg-[#0B132B] text-white px-5 py-2 text-xs font-mono uppercase tracking-wider transition hover:bg-[#1E3A8A] active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] shadow-[2px_2px_0px_rgba(29,78,216,1)]"
            >
              Enter the Desk &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* ── Editorial Hero ── */}
      <main className="mx-auto max-w-7xl px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Thesis Column */}
        <section className="lg:col-span-7 space-y-8">
          <div className="inline-block px-3 py-1 bg-[#FEF08A] text-[#0B132B] border border-[#0B132B] text-xs font-mono uppercase tracking-wider">
            Autonomous Galley Press
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-none text-[#0B132B]">
            Automating the editorial architecture of composition & publishing.
          </h1>
          
          <p className="font-sans text-[#4B5563] text-lg md:text-xl leading-relaxed max-w-2xl">
            ArticleShip replaces generic templates with deep, publish-ready research and typesetting. 
            By parsing keywords into structural Outlines, writing drafts with internal citation networks, 
            and embedding image plates, it sets finished articles directly into your galley.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4 font-mono text-xs uppercase tracking-wider">
            <Link 
              href="/generate" 
              className="inline-flex h-12 items-center justify-center rounded-none bg-[#0B132B] text-white px-6 font-bold transition hover:bg-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] shadow-[3px_3px_0px_rgba(29,78,216,1)] hover:shadow-none active:translate-x-0.5 active:translate-y-0.5"
            >
              Open Manuscript Desk &rarr;
            </Link>
            <Link 
              href="/articles" 
              className="inline-flex h-12 items-center justify-center rounded-none border-2 border-[#0B132B] bg-transparent text-[#0B132B] px-6 font-bold transition hover:bg-[#0B132B]/5 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] shadow-[3px_3px_0px_rgba(11,19,43,1)] hover:shadow-none active:translate-x-0.5 active:translate-y-0.5"
            >
              Review Galley Proofs
            </Link>
          </div>
        </section>

        {/* Visual Showcase (The Galley Plate) */}
        <section className="lg:col-span-5 border-2 border-[#0B132B] bg-white p-6 md:p-8 space-y-6 shadow-[4px_4px_0px_rgba(11,19,43,1)]">
          <div className="flex items-center justify-between border-b border-[#0B132B]/20 pb-4">
            <span className="font-mono text-xs font-bold text-[#4B5563] tracking-widest uppercase">
              TYPESETTING SCHEMATIC
            </span>
            <span className="font-mono text-xs text-[#1E3A8A]">
              WIDTH: 520px
            </span>
          </div>

          <div className="space-y-4 font-mono text-xs text-[#0B132B]">
            {/* Outline Segment */}
            <div className="p-3 bg-[#F4F6F9] border border-[#0B132B]/20 space-y-2">
              <div className="flex justify-between text-[#4B5563] font-bold">
                <span>01 / KEYWORD MAP</span>
                <span className="text-[#1E3A8A]">COMPLETED</span>
              </div>
              <p className="font-serif italic text-sm text-[#0B132B]">
                "Topical authority clusters mapped to target search intent."
              </p>
            </div>

            {/* Outline Segment 2 */}
            <div className="p-3 bg-[#F4F6F9] border border-[#0B132B]/20 space-y-2">
              <div className="flex justify-between text-[#4B5563] font-bold">
                <span>02 / HEADINGS MATRIX</span>
                <span className="text-[#1E3A8A]">COMPLETED</span>
              </div>
              <p className="font-serif italic text-sm text-[#0B132B]">
                "Subheadings structurally ordered by semantic logical flow."
              </p>
            </div>

            {/* Outline Segment 3 */}
            <div className="p-3 bg-[#FEF08A]/60 border border-[#0B132B] space-y-2">
              <div className="flex justify-between text-[#0B132B] font-bold">
                <span>03 / COMPOSITION PROOF</span>
                <span className="animate-pulse text-[#1D4ED8]">TYPESETTING...</span>
              </div>
              <p className="font-serif italic text-sm text-[#0B132B] leading-relaxed">
                The database indices organize key trees, accelerating read-path lookups by logarithmic search complexity...
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Editorial Pillars ── */}
      <section className="border-t-2 border-b-2 border-[#0B132B] bg-[#0B132B]/5 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center md:text-left space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#1E3A8A] font-bold">
              THE THREE PILLARS OF EDITORIAL FIDELITY
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B132B]">
              Engineered for genuine substance.
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                number: "I",
                title: "Deep-Well Research",
                desc: "Every manuscript is grounded in technical web-crawls and search indexes. Abstract summaries are rejected in favor of verified facts, accurate terminology, and real domain concepts."
              },
              {
                number: "II",
                title: "Galley-Link Injections",
                desc: "Instead of orphaned pages, the engine actively maps existing layout categories to inject natural, high-context internal links, building a cohesive publication structure."
              },
              {
                number: "III",
                title: "Illustrative Setting",
                desc: "Finished articles are not just walls of text. Every draft is automatically typeset alongside matching figures, stock photography plates, and clean CSS-aligned tables."
              }
            ].map((f, i) => (
              <div key={i} className="border-2 border-[#0B132B] bg-white p-6 md:p-8 space-y-4 hover:shadow-[3px_3px_0px_rgba(11,19,43,1)] transition-all">
                <div className="font-mono text-xl font-bold text-[#1E3A8A]">{f.number}</div>
                <h3 className="text-lg font-bold text-[#0B132B]">{f.title}</h3>
                <p className="font-sans text-sm text-[#4B5563] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 bg-white">
        <div className="mx-auto max-w-7xl px-6 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 border-t border-[#0B132B]/10 pt-8">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold tracking-widest text-[#0B132B] uppercase">
              ArticleShip Publishing House
            </span>
          </div>
          <p className="font-mono text-[10px] text-[#4B5563] uppercase tracking-wider">
            © 2026 Kush Goel | Editorial Insights. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
