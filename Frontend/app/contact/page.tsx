import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact | ArticleShip",
  description: "Get in touch with the ArticleShip Studio team."
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 md:px-8">
      <section className="glass-card rounded-3xl p-8 md:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Contact</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Let’s talk about your content workflow.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">
          For support, product questions, or collaboration, reach out through your preferred channel. You can
          replace this section with a real email address, contact form, or support desk link.
        </p>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Email</p>
          <p className="mt-1 text-sm text-slate-600">support@articleship.local</p>
        </div>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          Back to home
        </Link>
      </section>
    </main>
  );
}