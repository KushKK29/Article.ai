import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import CookieConsent from "@/components/CookieConsent";

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
  title: "Kush Goel | Tech & SEO Insights",
  description: "A personal publication documenting deep dives into software engineering, technical SEO, and digital growth."
};

import { ThemeProvider } from "@/lib/ThemeContext";
import { AuthProvider } from "@/lib/AuthContext";


export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${space.variable}`}>
        <ThemeProvider>
          <AuthProvider>
          <div className="min-h-screen">
            <SiteHeader />
            {children}
          <footer className="mt-20 border-t-2 border-[#0B132B] bg-[#F4F6F9] text-[#0B132B]">
            <div className="mx-auto w-full max-w-7xl px-6 py-14">
              <div className="grid grid-cols-1 gap-12 md:grid-cols-12 font-serif">
                <div className="md:col-span-5 space-y-4">
                  <p className="flex items-center gap-2 text-2xl font-extrabold uppercase tracking-tight text-[#0B132B]">
                    ArticleShip
                  </p>
                  <p className="max-w-md text-sm leading-relaxed text-[#4B5563] font-sans">
                    An automated galley press and composition engine. Building publish-ready manuscripts and technical SEO indexing proofs.
                  </p>
                </div>

                <div className="md:col-span-3 md:col-start-9">
                  <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-[#4B5563] font-mono">Navigate</h3>
                  <nav className="space-y-2 text-sm font-sans">
                    <Link href="/articles" className="block transition hover:text-[#1E3A8A] hover:underline">All Manuscripts</Link>
                    <Link href="/generate" className="block transition hover:text-[#1E3A8A] hover:underline">Compose Proof</Link>
                    <Link href="/pricing" className="block transition hover:text-[#1E3A8A] hover:underline">Ledger Rates</Link>
                    <Link href="/about" className="block transition hover:text-[#1E3A8A] hover:underline">About Desk</Link>
                    <Link href="/faq" className="block transition hover:text-[#1E3A8A] hover:underline">Registry FAQ</Link>
                    <Link href="/account" className="block transition hover:text-[#1E3A8A] hover:underline">Account Ledger</Link>
                    <Link href="/privacy-policy" className="block transition hover:text-[#1E3A8A] hover:underline">Privacy Policy</Link>
                    <Link href="/contact" className="block transition hover:text-[#1E3A8A] hover:underline">Contact Desk</Link>
                  </nav>
                </div>
              </div>

              <div className="mt-14 flex flex-col gap-4 border-t border-[#0B132B]/10 pt-7 text-xs font-mono text-[#4B5563] uppercase tracking-wider md:flex-row md:items-center md:justify-between">
                <p>© 2026 ArticleShip Publishing House. All rights reserved.</p>
                <div className="flex flex-wrap items-center gap-6">
                  <Link href="/privacy-policy" className="transition hover:text-[#1D4ED8]">Privacy Policy</Link>
                  <Link href="/terms" className="transition hover:text-[#1D4ED8]">Terms</Link>
                </div>
              </div>
            </div>
          </footer>
          </div>
          <CookieConsent />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
