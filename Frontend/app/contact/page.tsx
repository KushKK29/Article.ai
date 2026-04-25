import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact | ArticleShip",
  description: "Get in touch with the ArticleShip Studio team."
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 md:py-24 bg-[#f8fafc]">
      <div className="space-y-12">
        <header className="space-y-4 border-b border-slate-200 pb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Contact</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Let’s talk about your content workflow.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
            For support, product questions, or collaboration, reach out through your preferred channel. We are 
            always ready to help you optimize your publishing pipeline.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Email Support</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Drop us an email for technical questions or general inquiries.
            </p>
            <p className="mt-4 text-sm font-medium text-slate-900">
              <a href="mailto:support@articleship.local" className="hover:underline">support@articleship.local</a>
            </p>
          </div>
          
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Sales & Enterprise</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Need custom integrations or bulk content generation features?
            </p>
            <p className="mt-4 text-sm font-medium text-slate-900">
              <a href="mailto:sales@articleship.local" className="hover:underline">sales@articleship.local</a>
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200">
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