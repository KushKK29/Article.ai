import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Kush Goel",
  description: "Read the privacy policy for Kush Goel's personal technical blog."
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 md:py-24 bg-white text-slate-900">
      <article className="space-y-8">
        <header className="space-y-4 border-b border-slate-200 pb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Compliance</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-slate-500">Last Updated: May 2026</p>
        </header>

        <div className="prose prose-slate prose-lg max-w-none text-slate-700 space-y-6">
          <p>
            Your privacy is important to me. This policy explains how I handle data when you visit my 
            personal technical blog.
          </p>
          <h2 className="text-2xl font-bold text-slate-900">Data Collection</h2>
          <p>
            I do not collect personal information unless you voluntarily provide it (e.g., through a 
            contact form or newsletter sign-up). My site may use standard cookies to improve your 
            reading experience and analyze traffic patterns through tools like Google Analytics.
          </p>
          <h2 className="text-2xl font-bold text-slate-900">Your Rights</h2>
          <p>
            If you have any questions about this policy or want to request the deletion of any personal 
            data you have provided, please contact me directly.
          </p>
        </div>

        <div className="pt-8 border-t border-slate-200 flex gap-4">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Back Home
          </Link>
        </div>
      </article>
    </main>
  );
}