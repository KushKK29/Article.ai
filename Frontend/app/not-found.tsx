import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center bg-[var(--paper)] text-[var(--ink)] px-6 py-24 text-center font-serif selection:bg-[var(--highlight)] selection:text-[#0B132B]">
      <div className="w-full max-w-lg bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-8 md:p-12 shadow-[4px_4px_0px_var(--ink)] space-y-6">
        
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#1D4ED8] bg-[var(--highlight)] border border-[#0B132B]/10 px-3 py-1 font-bold">
          Errata: Folio 404
        </span>

        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Page Not in This Issue
        </h1>

        <p className="font-serif text-sm leading-relaxed text-[var(--ink-muted)] max-w-sm mx-auto">
          The requested dispatch or manuscript archive cannot be located. It may have been retired, moved, or typeset under an alternate index.
        </p>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/generate" 
            className="flex w-full sm:w-auto items-center justify-center rounded-none bg-[var(--ink)] px-6 py-3 text-xs font-mono font-bold uppercase tracking-wider text-[var(--paper)] shadow-[2px_2px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-y-0.5"
          >
            Go to Manuscript Desk
          </Link>
          <Link 
            href="/articles" 
            className="flex w-full sm:w-auto items-center justify-center rounded-none border-2 border-[var(--ink)] bg-[var(--plate)] px-6 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)] shadow-[2px_2px_0px_var(--ink)] hover:bg-[var(--paper)] transition-all"
          >
            Review Published Archives
          </Link>
        </div>

      </div>
    </main>
  );
}
