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
          <footer className="border-t border-slate-200/80 bg-white/70">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
              <p>ArticleShip Studio</p>
              <div className="flex flex-wrap gap-4">
                <Link href="/about" className="transition hover:text-slate-800">About</Link>
                <Link href="/privacy-policy" className="transition hover:text-slate-800">Privacy Policy</Link>
                <Link href="/contact" className="transition hover:text-slate-800">Contact</Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
