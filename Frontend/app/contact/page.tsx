/**
 * NOTE FOR USER REVIEW:
 * Please verify/confirm the following values before launch:
 * 1. SLA Response Time: 24 hours
 * 2. Primary email backup: support@articleship.com
 */

"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to deliver message.");
      }

      setSuccessMsg("Your dispatch has been successfully recorded. Thank you.");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network failure.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] px-6 py-16 md:px-12 font-serif selection:bg-[var(--highlight)] selection:text-[#0B132B]">
      <div className="mx-auto max-w-[800px] space-y-12">
        
        {/* Header Block */}
        <header className="border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-8 space-y-3">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--accent)]">Editorial Registry</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Contact the Desk</h1>
          <p className="text-xs font-mono uppercase text-[var(--ink-muted)]">
            Submit your inquiry. We typically respond within 24 hours.
          </p>
        </header>

        <div className="grid gap-12 md:grid-cols-[1fr_260px]">
          
          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-6 bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0px_var(--press-dark)]">
            <h2 className="text-lg font-extrabold font-serif border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-2">Manuscript Dispatch Form</h2>
            
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-500 text-emerald-800 p-4 font-mono text-[10px] uppercase tracking-wider">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-500 text-rose-800 p-4 font-mono text-[10px] uppercase tracking-wider">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">Sender Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-[var(--paper)] border-2 border-[var(--ink)] p-3 rounded-none font-sans text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[2px_2px_0px_rgba(29,78,216,1)] transition-all"
                placeholder="e.g. Kush Goel"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">Return Address (Email)</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-[var(--paper)] border-2 border-[var(--ink)] p-3 rounded-none font-sans text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[2px_2px_0px_rgba(29,78,216,1)] transition-all"
                placeholder="you@domain.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="subject" className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">Inquiry Subject</label>
              <input
                id="subject"
                name="subject"
                type="text"
                required
                value={formData.subject}
                onChange={handleChange}
                className="w-full bg-[var(--paper)] border-2 border-[var(--ink)] p-3 rounded-none font-sans text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[2px_2px_0px_rgba(29,78,216,1)] transition-all"
                placeholder="e.g. Custom Pricing Petition"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">Manuscript Details</label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                value={formData.message}
                onChange={handleChange}
                className="w-full bg-[var(--paper)] border-2 border-[var(--ink)] p-3 rounded-none font-sans text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[2px_2px_0px_rgba(29,78,216,1)] transition-all"
                placeholder="Enter details of your inquiry here..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--ink)] text-[var(--paper)] py-3.5 text-xs font-mono font-bold uppercase tracking-wider rounded-none shadow-[3px_3px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-y-0.5"
            >
              {loading ? "Transmitting..." : "Transmit Dispatch"}
            </button>
          </form>

          {/* Sidebar details */}
          <aside className="space-y-6 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
            <div className="border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-4">
              <h3 className="font-bold text-[var(--ink)] mb-2">Registry Office</h3>
              <p>ArticleShip Publishing</p>
              <p>Editorial Desk</p>
            </div>
            <div className="border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-4">
              <h3 className="font-bold text-[var(--ink)] mb-2">Direct Mail</h3>
              <a href="mailto:support@articleship.com" className="text-[var(--accent-deep)] font-bold hover:underline">
                support@articleship.com
              </a>
            </div>
            <div>
              <h3 className="font-bold text-[var(--ink)] mb-2">Publishing Status</h3>
              <p>Active 24/7</p>
              <p>Automated compositor online.</p>
            </div>
          </aside>

        </div>
      </div>
    </main>
  );
}