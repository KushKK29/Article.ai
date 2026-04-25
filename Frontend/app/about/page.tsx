import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | ArticleShip",
  description: "Learn what ArticleShip Studio does and how it helps teams publish SEO-friendly content faster."
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24 bg-[#f8fafc]">
      <div className="space-y-12">
        <header className="space-y-4 border-b border-slate-200 pb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">About</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Built for structured content workflows.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
            ArticleShip Studio helps you generate, edit, and publish long-form technical content with a clean
            workflow from topic idea to live article. The goal is simple: reduce friction without reducing quality.
          </p>
        </header>

        <div className="grid gap-8 sm:grid-cols-3">
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">1. Generate</h2>
            <p className="text-sm leading-relaxed text-slate-600">Create structured content packages from a single topic with automatic SEO keyword generation.</p>
          </div>
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">2. Refine</h2>
            <p className="text-sm leading-relaxed text-slate-600">Edit copy, adjust images, and manage formatting interactively before anything goes live.</p>
          </div>
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">3. Publish</h2>
            <p className="text-sm leading-relaxed text-slate-600">Ship clean article pages with live structure, links, and accurate meta tags instantly.</p>
          </div>
        </div>

        <div className="pt-8">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}