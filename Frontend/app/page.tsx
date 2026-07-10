import Link from "next/link";
import { CountUp, Reveal } from "@/components/Reveal";
import ScrollRail from "@/components/ScrollRail";

const railSections = [
  { id: "press-record", label: "The Record" },
  { id: "pillars", label: "Pillars" },
  { id: "press-run", label: "Press Run" },
  { id: "rates", label: "Rates" }
];

const pillars = [
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
];

const steps = [
  {
    number: "01",
    title: "Set the Keywords",
    desc: "Hand the desk a topic. The engine maps topical authority clusters against real search intent and locks the keyword plate."
  },
  {
    number: "02",
    title: "Impose the Structure",
    desc: "Subheadings are structurally ordered by semantic flow — a headings matrix imposed before a single line is composed."
  },
  {
    number: "03",
    title: "Pull the Proof",
    desc: "The draft is composed against the structure with an internal citation network, ready for your review on the workbench."
  },
  {
    number: "04",
    title: "Press & Publish",
    desc: "Image plates are set, tables aligned, links injected — and the finished article lands directly in your galley."
  }
];

// ponytail: placeholder foundry figures — swap for real numbers before launch
const stats = [
  { value: 12480, suffix: "+", label: "Manuscripts pressed" },
  { value: 96, suffix: "%", label: "Proofs passed on first pull" },
  { value: 4, suffix: " min", label: "Average press run" }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] selection:bg-[var(--highlight)] selection:text-[#0B132B] font-serif transition-colors duration-300">

      {/* ── Masthead Header ── */}
      <header className="border-b-2 border-[var(--ink)]">
        <div className="mx-auto max-w-7xl px-6 py-6 md:py-8 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
          <div className="text-left font-mono text-xs uppercase tracking-widest text-[var(--ink-muted)]">
            EST. 2026 / VOL. IV NO. I
          </div>
          <div className="text-center">
            <Link href="/" className="letterpress inline-block font-serif text-3xl font-extrabold tracking-tighter text-[var(--ink)] uppercase hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2">
              ArticleShip
            </Link>
          </div>
          <div className="text-right hidden md:block">
            <Link
              href="/generate"
              className="inline-block rounded-none bg-[var(--ink)] text-[var(--paper)] px-5 py-2 text-xs font-mono uppercase tracking-wider transition hover:bg-[var(--accent-deep)] active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-[2px_2px_0px_var(--accent)]"
            >
              Enter the Desk &rarr;
            </Link>
          </div>
        </div>
      </header>

      <ScrollRail sections={railSections} />

      {/* ── Editorial Hero ── */}
      <div className="grain relative overflow-hidden">
        <div className="hero-drift" aria-hidden />
        <main className="relative mx-auto max-w-7xl px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* Thesis Column */}
          <section className="lg:col-span-7 space-y-8">
            <Reveal>
              <div className="stamp px-3 py-1 bg-[var(--highlight)] text-[#0B132B] border-[#0B132B] text-xs font-mono uppercase tracking-wider">
                Autonomous Galley Press
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="letterpress font-serif text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-[var(--ink)]">
                Automating the editorial architecture of composition &amp; publishing.
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="font-sans text-[var(--ink-muted)] text-lg md:text-xl leading-relaxed max-w-2xl">
                ArticleShip replaces generic templates with deep, publish-ready research and typesetting.
                By parsing keywords into structural Outlines, writing drafts with internal citation networks,
                and embedding image plates, it sets finished articles directly into your galley.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="flex flex-col sm:flex-row gap-4 pt-4 font-mono text-xs uppercase tracking-wider">
                <Link
                  href="/generate"
                  className="inline-flex h-12 items-center justify-center rounded-none bg-[var(--ink)] text-[var(--paper)] px-6 font-bold transition hover:bg-[var(--accent-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-[3px_3px_0px_var(--accent)] hover:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  Open Manuscript Desk &rarr;
                </Link>
                <Link
                  href="/articles"
                  className="inline-flex h-12 items-center justify-center rounded-none border-2 border-[var(--ink)] bg-transparent text-[var(--ink)] px-6 font-bold transition hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-[3px_3px_0px_var(--press-dark)] hover:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  Review Galley Proofs
                </Link>
              </div>
            </Reveal>
          </section>

          {/* Visual Showcase (The Galley Plate) */}
          <Reveal delay={200} className="lg:col-span-5">
            <section className="border-2 border-[var(--ink)] bg-[var(--plate)] p-6 md:p-8 space-y-6 shadow-[4px_4px_0px_var(--press-dark)]">
              <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--ink)_20%,transparent)] pb-4">
                <span className="font-mono text-xs font-bold text-[var(--ink-muted)] tracking-widest uppercase">
                  TYPESETTING SCHEMATIC
                </span>
                <span className="font-mono text-xs text-[var(--accent)]">
                  WIDTH: 520px
                </span>
              </div>

              <div className="space-y-4 font-mono text-xs text-[var(--ink)]">
                <div className="p-3 bg-[var(--paper)] border border-[color-mix(in_srgb,var(--ink)_20%,transparent)] space-y-2">
                  <div className="flex justify-between text-[var(--ink-muted)] font-bold">
                    <span>01 / KEYWORD MAP</span>
                    <span className="text-[var(--accent)]">COMPLETED</span>
                  </div>
                  <p className="font-serif italic text-sm text-[var(--ink)]">
                    &quot;Topical authority clusters mapped to target search intent.&quot;
                  </p>
                </div>

                <div className="p-3 bg-[var(--paper)] border border-[color-mix(in_srgb,var(--ink)_20%,transparent)] space-y-2">
                  <div className="flex justify-between text-[var(--ink-muted)] font-bold">
                    <span>02 / HEADINGS MATRIX</span>
                    <span className="text-[var(--accent)]">COMPLETED</span>
                  </div>
                  <p className="font-serif italic text-sm text-[var(--ink)]">
                    &quot;Subheadings structurally ordered by semantic logical flow.&quot;
                  </p>
                </div>

                <div className="p-3 bg-[color-mix(in_srgb,var(--highlight)_60%,transparent)] border border-[var(--ink)] space-y-2 text-[var(--ink)]">
                  <div className="flex justify-between font-bold">
                    <span>03 / COMPOSITION PROOF</span>
                    <span className="animate-pulse text-[var(--accent)]">TYPESETTING...</span>
                  </div>
                  <p className="font-serif italic text-sm leading-relaxed">
                    The database indices organize key trees, accelerating read-path lookups by logarithmic search complexity...
                  </p>
                </div>
              </div>
            </section>
          </Reveal>
        </main>
      </div>

      {/* ── Press Record (trust strip) ── */}
      <section id="press-record" className="scroll-mt-16 border-t-2 border-[var(--ink)] bg-[var(--plate)]">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6 text-center sm:divide-x divide-[color-mix(in_srgb,var(--ink)_10%,transparent)]">
              {stats.map((stat) => (
                <div key={stat.label} className="space-y-2 px-4">
                  <div className="letterpress font-serif text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--ink)]">
                    <CountUp to={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-widest text-[var(--ink-muted)]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={150}>
            <blockquote className="mx-auto mt-12 max-w-2xl border-t border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pt-8 text-center">
              <p className="font-serif italic text-lg md:text-xl leading-relaxed text-[var(--ink)]">
                &ldquo;The first drafting tool that thinks like a compositor — structure first, ink second.&rdquo;
              </p>
              <footer className="mt-3 font-mono text-[11px] uppercase tracking-widest text-[var(--ink-muted)]">
                — The Editorial Desk, Early Proof Reader
              </footer>
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* ── Editorial Pillars ── */}
      <section id="pillars" className="scroll-mt-16 border-t-2 border-b-2 border-[var(--ink)] bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="mb-16 text-center md:text-left space-y-2">
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-bold">
                THE THREE PILLARS OF EDITORIAL FIDELITY
              </span>
              <h2 className="letterpress font-serif text-3xl md:text-4xl font-extrabold text-[var(--ink)]">
                Engineered for genuine substance.
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pillars.map((f, i) => (
              <Reveal key={f.number} delay={i * 110}>
                <div className="ink-frame press-lift h-full border-2 border-[var(--ink)] bg-[var(--plate)] p-6 md:p-8 space-y-4 shadow-[3px_3px_0px_var(--press-dark)]">
                  <div className="font-mono text-xl font-bold text-[var(--accent)]">{f.number}</div>
                  <h3 className="font-serif text-lg font-bold text-[var(--ink)]">{f.title}</h3>
                  <p className="font-sans text-sm text-[var(--ink-muted)] leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How the Press Runs ── */}
      <section id="press-run" className="scroll-mt-16 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="mb-16 space-y-2 text-center">
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-bold">
                FROM KEYWORD TO GALLEY
              </span>
              <h2 className="letterpress font-serif text-3xl md:text-4xl font-extrabold text-[var(--ink)]">
                How the press runs.
              </h2>
            </div>
          </Reveal>

          <Reveal>
            <div className="relative grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-8">
              {/* Connector rule draws left→right as the section inks in (desktop only) */}
              <div aria-hidden className="rule-draw absolute left-0 right-0 top-5 hidden h-[2px] bg-[color-mix(in_srgb,var(--ink)_20%,transparent)] md:block" />
              {steps.map((step) => (
                <div key={step.number} className="relative space-y-3">
                  <div className="relative z-10 inline-flex h-10 w-10 items-center justify-center border-2 border-[var(--ink)] bg-[var(--paper)] font-mono text-sm font-bold text-[var(--ink)]">
                    {step.number}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[var(--ink)]">{step.title}</h3>
                  <p className="font-sans text-sm leading-relaxed text-[var(--ink-muted)]">{step.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Rate Card Ledger ── */}
      <section id="rates" className="scroll-mt-16 border-t-2 border-[var(--ink)] bg-[var(--plate)]">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Reveal>
            <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
              <div className="space-y-1 text-center md:text-left">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
                  The Litho Press Ledger
                </span>
                <h2 className="font-serif text-2xl font-extrabold text-[var(--ink)]">Simple, predictable rates.</h2>
              </div>
              <div className="flex flex-col items-center gap-6 font-mono text-xs uppercase tracking-wider sm:flex-row">
                <div className="text-center">
                  <div className="font-serif text-xl font-extrabold normal-case tracking-tight">$0</div>
                  <div className="text-[var(--ink-muted)]">Free Sheet</div>
                </div>
                <div className="text-center">
                  <div className="font-serif text-xl font-extrabold normal-case tracking-tight">$49/mo</div>
                  <div className="text-[var(--accent)] font-bold">Pro Press ★</div>
                </div>
                <div className="text-center">
                  <div className="font-serif text-xl font-extrabold normal-case tracking-tight">$149/mo</div>
                  <div className="text-[var(--ink-muted)]">Agency Master</div>
                </div>
              </div>
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center rounded-none border-2 border-[var(--ink)] px-5 font-mono text-xs font-bold uppercase tracking-wider text-[var(--ink)] transition hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] shadow-[2px_2px_0px_var(--press-dark)] hover:shadow-none active:translate-x-0.5 active:translate-y-0.5"
              >
                View Full Rate Card &rarr;
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28 text-center space-y-8">
          <Reveal>
            <h2 className="mx-auto max-w-3xl font-serif text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Set your first manuscript <span className="bg-[var(--highlight)] px-2 text-[#0B132B]">today</span>.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <Link
              href="/generate"
              className="inline-flex h-14 items-center justify-center rounded-none bg-[var(--highlight)] px-10 font-mono text-sm font-bold uppercase tracking-wider text-[#0B132B] transition hover:brightness-95 shadow-[4px_4px_0px_rgba(255,255,255,0.25)] hover:shadow-none active:translate-x-0.5 active:translate-y-0.5"
            >
              Open the Manuscript Desk &rarr;
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
