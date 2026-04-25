import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center bg-[#f8fafc]">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-8xl font-bold tracking-tight text-slate-900">404</h1>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800">
          Page not found
        </h2>
        <p className="text-base text-slate-500">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link 
            href="/" 
            className="flex w-full sm:w-auto items-center justify-center rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            Go to Dashboard
          </Link>
          <Link 
            href="/articles" 
            className="flex w-full sm:w-auto items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            All Articles
          </Link>
        </div>
      </div>
    </main>
  );
}
