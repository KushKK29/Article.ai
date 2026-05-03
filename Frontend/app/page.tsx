import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#020617] text-white selection:bg-cyan-500/30">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#020617]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
              <span className="text-xl font-black italic tracking-tighter text-white">AS</span>
            </div>
            <span className="text-xl font-bold tracking-tight">ArticleShip</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/generate" className="rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-slate-200">
              Start Writing
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
        {/* Animated Background Glows */}
        <div className="absolute top-1/4 -left-20 h-[500px] w-[500px] animate-pulse rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 h-[500px] w-[500px] animate-pulse rounded-full bg-blue-600/10 blur-[120px]" />
        
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-xs font-semibold tracking-wide text-emerald-400 uppercase">Independent Tech & SEO Journalism</span>
          </div>
          
          <h1 className="mx-auto mb-8 max-w-4xl text-5xl font-black tracking-tight md:text-7xl lg:text-8xl">
            Deep dives into <span className="bg-gradient-to-r from-emerald-400 via-teal-500 to-sky-600 bg-clip-text text-transparent">modern tech & growth.</span>
          </h1>
          
          <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
            Hard-won insights on SEO, software engineering, and the future of development. 
            No fluff, just data-driven strategies and personal experience from the front lines.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/generate" className="group relative flex h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 text-lg font-bold text-white transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)]">
              Launch Content Studio
              <svg className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href="/articles" className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-8 text-lg font-bold text-white transition hover:bg-white/10">
              Manage Articles
            </Link>
          </div>

          <div className="mt-20 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-2 backdrop-blur-xl">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/5 shadow-2xl">
              <Image 
                src="/articleship_hero_image_1777800519611.png" 
                alt="ArticleShip Platform Interface"
                fill
                className="object-cover opacity-90"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="relative border-y border-white/5 bg-slate-950/50 py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-5xl">Engineered for Search.</h2>
            <p className="text-slate-400">Stop fighting Google. Start playing by its rules.</p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "In-Depth Research",
                desc: "Every article starts with exhaustive web-crawling and technical research to ensure every claim is grounded in the latest data.",
                icon: (
                  <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )
              },
              {
                title: "Topical Authority",
                desc: "Strategic internal linking architecture that maps your niche effectively, helping both readers and search engines navigate complex topics.",
                icon: (
                  <svg className="h-6 w-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                )
              },
              {
                title: "Visual Storytelling",
                desc: "Curated hero images and technical illustrations that reduce bounce rates and improve information retention.",
                icon: (
                  <svg className="h-6 w-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )
              }
            ].map((f, i) => (
              <div key={i} className="group rounded-3xl border border-white/5 bg-white/5 p-8 transition hover:border-white/10 hover:bg-white/[0.07]">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 transition group-hover:scale-110">
                  {f.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold">{f.title}</h3>
                <p className="leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600" />
            <span className="text-lg font-bold tracking-tight">Kush Goel</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 Kush Goel | Tech & SEO Insights. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
