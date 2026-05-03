import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact | Kush Goel",
  description: "Get in touch with Kush Goel for inquiries about tech, SEO, or collaborations."
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 md:py-24 bg-white text-slate-900">
      <div className="space-y-12">
        <header className="space-y-4 border-b border-slate-200 pb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Get in Touch</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Let&apos;s connect.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
            Whether you have a question about one of my articles, want to discuss a technical problem, 
            or are interested in collaborating on a research project, I&apos;d love to hear from you.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Direct Inquiries</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              For detailed questions or professional inquiries, please reach out via email.
            </p>
            <p className="mt-6 text-base font-bold text-emerald-600">
              <a href="mailto:hello@kushgoel.com" className="hover:underline">hello@kushgoel.com</a>
            </p>
          </div>
          
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Social Presence</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              I share most of my daily technical findings and quick SEO tips on Twitter.
            </p>
            <p className="mt-6 text-base font-bold text-sky-600">
              <a href="#" className="hover:underline">@kushgoel</a>
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-8 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}