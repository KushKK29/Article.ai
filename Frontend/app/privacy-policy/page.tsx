import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | ArticleShip",
  description: "Read the privacy policy for ArticleShip Studio."
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 md:py-24 bg-[#f8fafc]">
      <article className="space-y-8">
        <header className="space-y-4 border-b border-slate-200 pb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Privacy Policy</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Privacy matters here.
          </h1>
        </header>

        <div className="prose prose-slate prose-sm sm:prose-base max-w-none text-slate-600 space-y-6">
          <p>
            ArticleShip Studio may collect the information you submit through forms, saved drafts, and generated
            content workflows so the application can function correctly.
          </p>
          <p>
            We use that data to provide the product experience, improve reliability, and support publishing
            features. We do not intentionally sell your content to third parties or train models on private drafts without permission.
          </p>
          <p>
            If you want this page to match your real backend policy, replace this draft with your legal text and
            data retention rules.
          </p>
        </div>

        <div className="pt-8 border-t border-slate-200">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </article>
    </main>
  );
}