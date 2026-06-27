import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center bg-[#F4F6F9] text-[#0B132B] px-6 py-24 text-center font-serif selection:bg-[#FEF08A] selection:text-[#0B132B]">
      <div className="w-full max-w-lg bg-white border-2 border-[#0B132B] rounded-2xl p-8 md:p-12 shadow-[4px_4px_0px_rgba(11,19,43,1)] space-y-6">
        
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#1D4ED8] bg-[#FEF08A] border border-[#0B132B]/10 px-3 py-1 font-bold">
          Errata: Folio 404
        </span>

        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Page Not in This Issue
        </h1>

        <p className="font-serif text-sm leading-relaxed text-[#4B5563] max-w-sm mx-auto">
          The requested dispatch or manuscript archive cannot be located. It may have been retired, moved, or typeset under an alternate index.
        </p>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/generate" 
            className="flex w-full sm:w-auto items-center justify-center rounded-none bg-[#0B132B] px-6 py-3 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-y-0.5"
          >
            Go to Manuscript Desk
          </Link>
          <Link 
            href="/articles" 
            className="flex w-full sm:w-auto items-center justify-center rounded-none border-2 border-[#0B132B] bg-white px-6 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-[#0B132B] shadow-[2px_2px_0px_rgba(11,19,43,1)] hover:bg-[#F4F6F9] transition-all"
          >
            Review Published Archives
          </Link>
        </div>

      </div>
    </main>
  );
}
