import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | ArticleShip",
  description: "Learn what ArticleShip Studio does and how it helps teams publish SEO-friendly content faster."
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
      <section className="glass-card rounded-3xl p-8 md:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">About</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Built for fast, structured content workflows.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">
          ArticleShip Studio helps you generate, edit, and publish long-form technical content with a clean
          workflow from topic idea to live article. The goal is simple: reduce friction without reducing quality.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Generate</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Create structured content packages from a single topic.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Refine</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Edit copy, images, and formatting before publishing.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Publish</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Ship clean article pages with live structure and links.</p>
          </div>
        </div>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          Back to home
        </Link>
      </section>
    </main>
  );
}