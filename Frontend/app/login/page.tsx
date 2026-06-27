"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import type { Metadata } from "next";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect away
  if (!loading && user) {
    router.replace("/generate");
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/generate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F4F6F9] text-[#0B132B] flex items-center justify-center px-6 py-16 selection:bg-[#FEF08A] selection:text-[#0B132B]">
      <div className="w-full max-w-md space-y-8">

        {/* Masthead */}
        <header className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <span className="flex h-12 w-12 items-center justify-center bg-[#0B132B] text-white text-sm font-mono font-bold shadow-[2px_2px_0px_rgba(29,78,216,1)] mx-auto">
              AS
            </span>
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#1D4ED8] pt-2">
            Editorial Console
          </p>
          <h1 className="text-2xl font-extrabold font-serif tracking-tight text-[#0B132B]">
            Sign in to your Desk
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[#4B5563]">
            Enter your credentials to access the manuscript press.
          </p>
        </header>

        {/* Form Card */}
        <div className="bg-white border-2 border-[#0B132B] p-8 shadow-[4px_4px_0px_rgba(11,19,43,1)] space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-400 text-rose-800 p-3 font-mono text-[10px] uppercase tracking-wider">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block font-mono text-[10px] uppercase tracking-wider text-[#4B5563]">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-[#F4F6F9] border-2 border-[#0B132B] px-3 py-2.5 font-sans text-sm text-[#0B132B] focus:outline-none focus:border-[#1D4ED8] focus:shadow-[2px_2px_0px_rgba(29,78,216,1)] transition-all rounded-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block font-mono text-[10px] uppercase tracking-wider text-[#4B5563]">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#F4F6F9] border-2 border-[#0B132B] px-3 py-2.5 font-sans text-sm text-[#0B132B] focus:outline-none focus:border-[#1D4ED8] focus:shadow-[2px_2px_0px_rgba(29,78,216,1)] transition-all rounded-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#0B132B] text-white py-3 text-xs font-mono font-bold uppercase tracking-widest shadow-[3px_3px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-y-0.5 disabled:opacity-60"
            >
              {submitting ? "Verifying…" : "Sign In to Desk"}
            </button>
          </form>

          <div className="border-t border-[#0B132B]/10 pt-4 text-center font-mono text-[10px] uppercase tracking-wider text-[#4B5563]">
            No account?{" "}
            <Link href="/signup" className="text-[#1D4ED8] font-bold hover:underline">
              Register a Free Desk →
            </Link>
          </div>
        </div>

        <p className="text-center font-mono text-[9px] uppercase tracking-wider text-[#4B5563]/60">
          By signing in you agree to our{" "}
          <Link href="/terms" className="underline hover:text-[#1D4ED8]">Terms</Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="underline hover:text-[#1D4ED8]">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
