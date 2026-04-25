import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap"
});

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap"
});

export const metadata: Metadata = {
  title: "ArticleShip Studio",
  description: "AI SEO content generation workspace"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${space.variable}`}>
        <div className="min-h-screen">
          <SiteHeader />
          {children}
          <footer className="mt-20 bg-[#141110] text-stone-300">
            <div className="mx-auto w-full max-w-6xl px-6 py-14 md:py-16">
              <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
                <div className="md:col-span-5">
                  <p className="mb-4 flex items-center gap-2 text-2xl font-semibold text-stone-100">
                    <span className="text-teal-500">›_</span>
                    <span>The Pragmatic Dev</span>
                  </p>
                  <p className="max-w-md text-lg leading-relaxed text-stone-400">
                    Honest writing about software development, AI tools, and the messy reality of building things. No hype, no fluff - just what actually works.
                  </p>
                </div>

                <div className="md:col-span-3 md:col-start-6">
                  <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-stone-500">Navigate</h3>
                  <nav className="space-y-2 text-lg">
                    <Link href="/blog" className="block transition hover:text-teal-400">Articles</Link>
                    <Link href="/about" className="block transition hover:text-teal-400">Themes/Plugins</Link>
                    <Link href="/blog" className="block transition hover:text-teal-400">Categories</Link>
                    <Link href="/about" className="block transition hover:text-teal-400">About</Link>
                  </nav>
                </div>

                <div className="md:col-span-3">
                  <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-stone-500">Connect</h3>
                  <div className="flex items-center gap-3">
                    <a
                      href="#"
                      aria-label="X"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-700 text-stone-300 transition hover:border-teal-500 hover:text-teal-400"
                    >
                      X
                    </a>
                    <a
                      href="#"
                      aria-label="GitHub"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-700 text-stone-300 transition hover:border-teal-500 hover:text-teal-400"
                    >
                      G
                    </a>
                    <a
                      href="#"
                      aria-label="LinkedIn"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-700 text-stone-300 transition hover:border-teal-500 hover:text-teal-400"
                    >
                      in
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-14 flex flex-col gap-4 border-t border-stone-800 pt-7 text-sm text-stone-500 md:flex-row md:items-center md:justify-between">
                <p>© 2026 The Pragmatic Dev. All rights reserved.</p>
                <div className="flex flex-wrap items-center gap-6">
                  <Link href="/privacy-policy" className="transition hover:text-teal-400">Privacy Policy</Link>
                  <Link href="/contact" className="transition hover:text-teal-400">Terms</Link>
                  <Link href="/blog" className="transition hover:text-teal-400">RSS Feed</Link>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
