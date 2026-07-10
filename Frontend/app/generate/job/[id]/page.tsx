"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ContentBlock } from "@/lib/types";
import { useAuthFetch } from "@/lib/useAuthFetch";
import RequireAuth from "@/components/RequireAuth";

type JobStatus = "queued" | "processing" | "completed" | "failed";
type StepName = "keywords" | "outline" | "content" | "images" | "formatting" | "done";

interface JobResponse {
  _id: string;
  user_id?: string | null;
  topic: string;
  status: JobStatus;
  current_step: StepName;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  result_article_id?: string | null;
  image_count?: number | null;
  resolved_image_count?: number | null;
}

interface ArticleResponse {
  article: {
    id: string;
    topic: string;
    category: string;
    status: string;
    payload: {
      content: string;
      meta?: any;
      keywords?: any;
      structure?: any;
      blocks?: ContentBlock[];
      images?: any[];
    };
  };
}

const STEPS: { name: StepName; label: string; desc: string }[] = [
  { name: "keywords", label: "Keywords Engine", desc: "Generating SEO keyword clusters & category" },
  { name: "outline", label: "Outline Structure", desc: "Building heading structure and sections" },
  { name: "content", label: "Content Generation", desc: "Writing deep context-aware section content" },
  { name: "images", label: "Image Fetching", desc: "Fetching and embedding high-priority images" },
  { name: "formatting", label: "HTML Formatting", desc: "Formatting final HTML payload" }
];

export default function JobStatusPage({ params }: { params: { id: string } }) {
  return (
    <RequireAuth>
      <JobStatusPageContent params={params} />
    </RequireAuth>
  );
}

function JobStatusPageContent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [job, setJob] = useState<JobResponse | null>(null);
  const [article, setArticle] = useState<ArticleResponse["article"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingErrorCount, setPollingErrorCount] = useState(0);

  const jobId = params.id;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Poll Job Status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await authFetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to fetch job status");
        }
        const data: JobResponse = await response.json();
        setJob(data);
        setPollingErrorCount(0);

        if (data.status === "completed" && data.result_article_id) {
          // Fetch finished article
          const artResponse = await authFetch(`/api/articles/${data.result_article_id}`, { cache: "no-store" });
          if (artResponse.ok) {
            const artData: ArticleResponse = await artResponse.json();
            setArticle(artData.article);
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        } else if (data.status === "failed") {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        }
      } catch (err) {
        setPollingErrorCount((prev) => prev + 1);
        if (pollingErrorCount > 5) {
          setError(err instanceof Error ? err.message : "Error connecting to server");
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        }
      }
    };

    fetchStatus();
    timerRef.current = setInterval(fetchStatus, 2500);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [jobId, pollingErrorCount]);

  const activeStepIndex = (() => {
    if (!job) return 0;
    if (job.status === "completed") return STEPS.length;
    if (job.status === "queued") return 0;
    
    const index = STEPS.findIndex((s) => s.name === job.current_step);
    return index !== -1 ? index : 0;
  })();

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] px-6 py-12 md:px-12 font-serif selection:bg-[var(--highlight)] selection:text-[#0B132B] max-w-[1000px] mx-auto">
      {/* Title block for SEO & Context */}
      <title>{job ? `Galley Run: ${job.topic}` : "Manuscript Galley Run"}</title>
      
      <div className="mb-8">
        <Link href="/generate" className="text-xs font-mono uppercase font-bold text-[var(--accent-deep)] hover:underline flex items-center gap-1">
          &larr; Return to Manuscript Desk
        </Link>
      </div>

      {error ? (
        <div className="bg-[var(--plate)] border-2 border-rose-350 rounded-2xl p-6 shadow-[3px_3px_0px_var(--press-dark)]" id="job-error-container">
          <h1 className="font-serif text-lg font-extrabold text-rose-800 mb-2">Typesetter Off-line</h1>
          <p className="text-xs font-mono uppercase text-[var(--ink-muted)]">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 rounded-none bg-[var(--ink)] text-[var(--paper)] px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-y-0.5"
          >
            Re-engage Press
          </button>
        </div>
      ) : !job ? (
        <div className="flex flex-col items-center justify-center py-20 font-mono text-xs">
          <div className="animate-spin rounded-none border-2 border-t-4 border-[var(--ink)] h-10 w-10 mb-4"></div>
          <p className="text-[var(--ink-muted)] uppercase tracking-wider font-bold">Querying Galley Status...</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0px_var(--press-dark)]">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0B132B] bg-[var(--highlight)] border border-[#0B132B]/20 px-3 py-1 inline-block">
              RUN ID: {job._id}
            </span>
            
            <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-[var(--ink)] mt-4 mb-2 leading-tight">
              {job.topic}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-mono uppercase text-[var(--ink-muted)]">
              <div>
                Press Status:{" "}
                <span className={`font-bold ${
                  job.status === "completed" ? "text-emerald-700" :
                  job.status === "failed" ? "text-rose-700" :
                  job.status === "processing" ? "text-[var(--accent)]" : "text-[var(--ink-muted)]"
                }`} id="job-status-value">
                  {job.status}
                </span>
              </div>
              <span>•</span>
              <div>Started: {new Date(job.created_at).toLocaleString()}</div>
            </div>

            {/* In Progress Inline Card */}
            {job.status !== "failed" && job.status !== "completed" && (
              <div className="mt-8 p-4 border-2 border-[var(--ink)] bg-[var(--paper)] flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-[var(--accent)] opacity-75"></div>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent)]"></span>
                </div>
                <div className="text-xs font-mono uppercase font-bold text-[var(--ink)]">
                  {job.status === "queued" ? "Galley in printing queue..." : `Composing Stage: ${job.current_step}...`}
                </div>
              </div>
            )}

            {/* User Suspended Error State */}
            {job.status === "failed" && (
              <div className="mt-8 p-6 rounded-none bg-rose-50 border-2 border-rose-800 text-rose-800 font-mono text-xs" id="job-failed-info">
                <h3 className="font-extrabold text-sm mb-2 uppercase tracking-wider border-b border-rose-800/10 pb-2">Galley Run Suspended</h3>
                <p className="leading-relaxed">
                  Galley run suspended at Stage: <span className="font-bold underline">{STEPS[activeStepIndex]?.label || job.current_step}</span>.<br />
                  Cause: <span className="italic">{job.error_message || "Unknown typesetting failure."}</span>.<br />
                  Requesting manual editor intervention.
                </p>
                <div className="mt-4 flex gap-3">
                  <Link href="/generate" className="rounded-none bg-[var(--ink)] text-[var(--paper)] px-4 py-2 text-[10px] font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-y-0.5">
                    Return to Desk
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Progress Element (Galley Tray) */}
          {job.status !== "failed" && (
            <div className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0px_var(--press-dark)]">
              <h2 className="font-serif text-lg font-extrabold text-[var(--ink)] mb-6">Galley Tray Run Status</h2>
              
              {/* Desktop Galley Tray */}
              <div className="hidden md:grid grid-cols-5 gap-3 border-2 border-[var(--ink)] bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] p-3 rounded-none mb-2">
                {STEPS.map((step, idx) => {
                  const isCompleted = idx < activeStepIndex;
                  const isActive = idx === activeStepIndex && job.status === "processing";
                  const isPending = idx > activeStepIndex || job.status === "queued";
                  const isFailedStep = idx === activeStepIndex && job.status === "failed";

                  let bgStyle = "bg-[var(--plate)] text-[color-mix(in_srgb,var(--ink)_40%,transparent)] border-[color-mix(in_srgb,var(--ink)_10%,transparent)] border-dashed";
                  if (isCompleted) bgStyle = "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]";
                  if (isActive) bgStyle = "bg-[var(--highlight)] text-[#0B132B] border-[#0B132B] shadow-[2px_2px_0px_var(--ink)] font-bold animate-pulse";
                  if (isFailedStep) bgStyle = "bg-rose-100 text-rose-800 border-rose-800 font-bold";

                  return (
                    <div key={step.name} className={`border-2 p-3 font-mono text-center flex flex-col justify-between transition-all ${bgStyle}`} id={`tray-step-${step.name}`}>
                      <span className="text-[9px] uppercase tracking-wider block opacity-70">Stage {idx + 1}</span>
                      <span className="text-[10px] font-bold block mt-2 leading-tight">{step.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Stack Tray */}
              <div className="md:hidden space-y-4 border-l-2 border-[var(--ink)] pl-4 mb-2">
                {STEPS.map((step, idx) => {
                  const isCompleted = idx < activeStepIndex;
                  const isActive = idx === activeStepIndex && job.status === "processing";
                  const isPending = idx > activeStepIndex || job.status === "queued";
                  const isFailedStep = idx === activeStepIndex && job.status === "failed";

                  let bgStyle = "border-transparent bg-transparent text-[var(--ink-muted)] opacity-60";
                  if (isCompleted) bgStyle = "border-[var(--ink)] bg-[var(--plate)] text-[var(--ink)] shadow-[1.5px_1.5px_0px_var(--ink)]";
                  if (isActive) bgStyle = "border-[#1D4ED8] bg-[var(--highlight)] text-[#0B132B] font-bold shadow-[2px_2px_0px_rgba(29,78,216,1)]";
                  if (isFailedStep) bgStyle = "border-rose-800 bg-rose-50 text-rose-800";

                  return (
                    <div key={step.name} className={`border-2 p-4 font-mono text-left transition-all ${bgStyle}`}>
                      <div className="text-[9px] uppercase tracking-wider font-bold">Stage {idx + 1} • {step.label}</div>
                      <div className="text-[11px] mt-1 font-sans">{step.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Finished Article section */}
          {job.status === "completed" && article && (
            <div className="space-y-6" id="finished-article-container">
              <div className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0px_var(--press-dark)] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-lg font-extrabold text-[var(--ink)]">Manuscript Composition Complete</h2>
                  <p className="text-xs font-mono uppercase text-[var(--ink-muted)] mt-1">Ready for print layout, editor feedback, and publishing.</p>
                  {job.resolved_image_count !== undefined && job.resolved_image_count !== null && job.image_count !== undefined && job.image_count !== null && (
                    <p className="text-xs font-mono text-[var(--accent)] mt-2 font-bold" id="job-image-resolution-feedback">
                      {job.resolved_image_count} images placed 
                      {job.resolved_image_count < job.image_count && (
                        <span> (your topic's outline didn't have enough sections to fit the requested {job.image_count})</span>
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <Link 
                    href={`/generate?articleId=${article.id}`}
                    className="rounded-none bg-[var(--ink)] text-[var(--paper)] px-5 py-3 text-xs font-mono font-bold uppercase tracking-wider shadow-[3px_3px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-y-0.5 block text-center"
                    id="edit-article-workbench-btn"
                  >
                    Open in Editor Desk &rarr;
                  </Link>
                </div>
              </div>

              <div className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0px_var(--press-dark)]">
                <div className="border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-4 mb-6">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--ink)] bg-[var(--paper)] border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-3 py-1">
                    {article.category}
                  </span>
                  <h3 className="font-serif text-xl font-extrabold text-[var(--ink)] mt-4">{article.topic}</h3>
                </div>

                <article 
                  className="article-html max-h-[500px] overflow-auto rounded-none border-2 border-[var(--ink)] p-6 bg-[var(--paper)] font-sans"
                  dangerouslySetInnerHTML={{ __html: article.payload.content }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
