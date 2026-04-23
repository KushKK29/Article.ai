import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | ArticleShip",
  description: "Read the privacy policy for ArticleShip Studio."
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 md:px-8">
      <section className="glass-card rounded-3xl p-8 md:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Privacy Policy</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Privacy matters here.
        </h1>
        <div className="mt-6 space-y-5 text-base leading-7 text-slate-600">
          <p>
            ArticleShip Studio may collect the information you submit through forms, saved drafts, and generated
            content workflows so the application can function correctly.
          </p>
          <p>
            We use that data to provide the product experience, improve reliability, and support publishing
            features. We do not intentionally sell your content.
          </p>
          <p>
            If you want this page to match your real backend policy, replace this draft with your legal text and
            retention rules.
          </p>
        </div>
        <Link href="/" className="mt-8 inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Back to home
        </Link>
      </section>
    </main>
  );
}