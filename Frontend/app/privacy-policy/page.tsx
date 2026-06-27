/**
 * NOTE FOR USER REVIEW:
 * Please verify/confirm the following values before launch:
 * 1. Data deletion retention: 30 days (Line 59)
 * 2. Contact email: legal@articleship.com (Line 71)
 * 3. Third-party data policy: Confirm no data is sold to advertisers (Line 63)
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Protocol | ArticleShip",
  description: "Read our privacy policies and technical data disclosure agreements."
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#F4F6F9] text-[#0B132B] px-6 py-16 md:px-12 font-serif selection:bg-[#FEF08A] selection:text-[#0B132B]">
      <article className="mx-auto max-w-[800px] space-y-12">
        
        {/* Legal Disclaimer Banner */}
        <div className="bg-amber-50 border-2 border-amber-500 p-5 rounded-none font-mono text-[10px] uppercase tracking-wider text-amber-900 shadow-[3px_3px_0px_rgba(245,158,11,0.1)]">
          <span className="font-extrabold block mb-1">⚠️ Legal Review Notice:</span>
          This document is a draft version compiled for customer preview. It is not legal advice and must be formally reviewed and edited by qualified legal counsel prior to commercial deployment.
        </div>

        <header className="border-b border-[#0B132B]/10 pb-8 space-y-3">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#1D4ED8]">Compliance Desk</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="text-xs font-mono uppercase text-[#4B5563]">Last Revised: June 2026</p>
        </header>

        <section className="prose prose-stone prose-md space-y-6 text-[#0B132B]">
          <p className="leading-relaxed">
            At ArticleShip (operated by Kush Goel), we respect your privacy and strive to maintain a transparent account of our technical data processing infrastructure. This document outlines how user information is registered, processed, and transmitted.
          </p>

          <h2 className="text-xl font-extrabold pt-4 font-serif">1. Infrastructure Data Architecture</h2>
          <p className="leading-relaxed">
            We store user account details, including emails and securely hashed passwords, in a dedicated MongoDB database hosted in secured environments. 
          </p>
          <p className="leading-relaxed">
            To secure logins and maintain sessions, we issue JSON Web Tokens (JWT) stored in browser storage. No credentials or unhashed details are transmitted across subsequent requests.
          </p>

          <h2 className="text-xl font-extrabold pt-4 font-serif">2. AI Pipeline Integration Data Flow</h2>
          <p className="leading-relaxed">
            When you initiate a manuscript generation run, the input topic, keywords, and outline configurations are dispatched to the Google Gemini API to generate the article body.
          </p>
          <p className="leading-relaxed">
            Image plate queries are dispatched directly to the Unsplash API or the Google Custom Search API to retrieve license-compliant media. No personal identifier data is passed alongside these API calls.
          </p>

          <h2 className="text-xl font-extrabold pt-4 font-serif">3. Data Retention and Account Deletion</h2>
          <p className="leading-relaxed">
            All compiled drafts, logs, and generated assets remain associated with your MongoDB account profile. If you submit a request to delete your account, your email, password logs, and all generated manuscripts will be completely purged from our database records within thirty (30) days.
          </p>

          <h2 className="text-xl font-extrabold pt-4 font-serif">4. Third-Party Sharing Policies</h2>
          <p className="leading-relaxed">
            We do not sell, barter, or distribute your email addresses, search queries, or generated manuscripts to third-party data brokers, advertising agencies, or marketing companies. All data pipeline processing exists solely to generate content for your personal blog desk.
          </p>

          <h2 className="text-xl font-extrabold pt-4 font-serif">5. Contact Information</h2>
          <p className="leading-relaxed">
            For questions regarding our privacy protocol, please contact us at: <a href="mailto:legal@articleship.com" className="text-[#1E3A8A] font-bold hover:underline">legal@articleship.com</a>.
          </p>
        </section>

        <div className="pt-8 border-t border-[#0B132B]/10">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center rounded-none border-2 border-[#0B132B] bg-white px-6 py-3 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(11,19,43,1)] hover:bg-[#F4F6F9]"
          >
            &larr; Return to Home Desk
          </Link>
        </div>
      </article>
    </main>
  );
}