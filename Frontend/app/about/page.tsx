import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Me | Kush Goel",
  description: "Learn more about Kush Goel, the writer and researcher behind this publication focused on tech, SEO, and growth."
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24 bg-white text-slate-900">
      <div className="space-y-12">
        <header className="space-y-4 border-b border-slate-200 pb-10 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">The Story Behind the Writing</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">
            Hi, I&apos;m Kush Goel.
          </h1>
          <p className="mx-auto md:mx-0 max-w-2xl text-xl leading-relaxed text-slate-600">
            I created this space as a personal digital journal where I share my deep dives 
            into the intersections of software engineering, technical SEO, and modern digital growth.
          </p>
        </header>

        <section className="prose prose-slate max-w-none space-y-6 text-lg leading-relaxed text-slate-700">
          <p>
            I&apos;ve always believed that the best way to learn is to teach. Over the last few years, 
            I found myself constantly researching complex technical topics—from the intricacies of 
            RAG architectures to the evolving landscape of search algorithms.
          </p>
          <p>
            This site is where I document those findings. Every article published here is the result 
            of hours of investigation, practical testing, and my own personal perspective on where 
            the industry is heading.
          </p>
          <h2 className="text-2xl font-bold text-slate-900 pt-6">My Mission</h2>
          <p>
            My goal is to provide high-signal, fluff-free content for fellow practitioners. 
            I focus on providing actionable strategies that are grounded in real data rather than 
            just theoretical speculation.
          </p>
          <p>
            Whether you&apos;re a developer looking to understand search visibility or a growth 
            strategist looking for technical depth, I hope you find these articles helpful 
            in your own journey.
          </p>
        </section>

        <div className="pt-12 flex flex-col sm:flex-row gap-4 items-center">
          <Link 
            href="/generate" 
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Go to My Writing Studio
          </Link>
          <Link 
            href="/articles" 
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Read My Articles
          </Link>
        </div>
      </div>
    </main>
  );
}