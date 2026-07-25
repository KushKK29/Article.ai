"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function SignupPage() {
  const { signup, verifyOtp, user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in → redirect
  if (!loading && user) {
    router.replace("/generate");
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await signup(email, password);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyOtp(email, otp);
      router.replace("/generate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await signup(email, password);
      setInfo("A new code has been sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center px-6 py-16 selection:bg-[var(--highlight)] selection:text-[#0B132B]">
      <div className="w-full max-w-md space-y-8">

        {/* Masthead */}
        <header className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <span className="flex h-12 w-12 items-center justify-center bg-[var(--ink)] text-[var(--paper)] text-sm font-mono font-bold shadow-[2px_2px_0px_rgba(29,78,216,1)] mx-auto">
              AS
            </span>
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent)] pt-2">
            Editorial Console
          </p>
          <h1 className="text-2xl font-extrabold font-serif tracking-tight text-[var(--ink)]">
            {step === "form" ? "Open Your Editorial Desk" : "Check Your Email"}
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
            {step === "form" ? "Free to start. No credit card required." : `We sent a 6-digit code to ${email}`}
          </p>
        </header>

        {/* Form Card */}
        <div className="bg-[var(--plate)] border-2 border-[var(--ink)] p-8 shadow-[4px_4px_0px_var(--ink)] space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-400 text-rose-800 p-3 font-mono text-[10px] uppercase tracking-wider">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-emerald-50 border border-emerald-400 text-emerald-800 p-3 font-mono text-[10px] uppercase tracking-wider">
              {info}
            </div>
          )}

          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
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
                  className="w-full bg-[var(--paper)] border-2 border-[var(--ink)] px-3 py-2.5 font-sans text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[2px_2px_0px_rgba(29,78,216,1)] transition-all rounded-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                  Password <span className="text-[color-mix(in_srgb,var(--ink-muted)_60%,transparent)]">(min 8 characters)</span>
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--paper)] border-2 border-[var(--ink)] px-3 py-2.5 font-sans text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[2px_2px_0px_rgba(29,78,216,1)] transition-all rounded-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm" className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                  Confirm Password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--paper)] border-2 border-[var(--ink)] px-3 py-2.5 font-sans text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[2px_2px_0px_rgba(29,78,216,1)] transition-all rounded-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[var(--ink)] text-[var(--paper)] py-3 text-xs font-mono font-bold uppercase tracking-widest shadow-[3px_3px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-y-0.5 disabled:opacity-60"
              >
                {submitting ? "Registering…" : "Open Free Desk"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="otp" className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full bg-[var(--paper)] border-2 border-[var(--ink)] px-3 py-2.5 font-sans text-lg tracking-[0.5em] text-center text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[2px_2px_0px_rgba(29,78,216,1)] transition-all rounded-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="w-full bg-[var(--ink)] text-[var(--paper)] py-3 text-xs font-mono font-bold uppercase tracking-widest shadow-[3px_3px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-y-0.5 disabled:opacity-60"
              >
                {submitting ? "Verifying…" : "Verify & Open Desk"}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={submitting}
                className="w-full text-center font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] hover:underline disabled:opacity-60"
              >
                Resend Code
              </button>
            </form>
          )}

          <div className="border-t border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pt-4 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
            Already have a desk?{" "}
            <Link href="/login" className="text-[var(--accent)] font-bold hover:underline">
              Sign In →
            </Link>
          </div>
        </div>

        <p className="text-center font-mono text-[9px] uppercase tracking-wider text-[color-mix(in_srgb,var(--ink-muted)_60%,transparent)]">
          By registering you agree to our{" "}
          <Link href="/terms" className="underline hover:text-[var(--accent)]">Terms</Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="underline hover:text-[var(--accent)]">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
