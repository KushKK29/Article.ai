"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthFetch } from "@/lib/useAuthFetch";
import RequireAuth from "@/components/RequireAuth";

type JobItem = {
  _id: string;
  topic: string;
  status: "queued" | "scheduled" | "processing" | "completed" | "failed";
  current_step: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  result_article_id: string | null;
};

type BatchSummary = {
  _id: string;
  name: string;
  created_at: string;
  total_count: number;
  completed_count: number;
  failed_count: number;
};

type RouteParams = {
  params: { id: string };
};

export default function BatchStatusPage({ params }: RouteParams) {
  return (
    <RequireAuth>
      <BatchStatusPageContent params={params} />
    </RequireAuth>
  );
}

function BatchStatusPageContent({ params }: RouteParams) {
  const batchId = params.id;
  const authFetch = useAuthFetch();
  const [batch, setBatch] = useState<BatchSummary | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchBatchStatus = async () => {
      try {
        const response = await authFetch(`/api/batches/${batchId}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to fetch batch details");
        }
        const data = await response.json();
        setBatch(data.batch);
        setJobs(data.jobs || []);
        setLoading(false);

        // Check if all jobs are finished (completed or failed)
        const allFinished = (data.jobs || []).every(
          (job: JobItem) => job.status === "completed" || job.status === "failed"
        );

        if (allFinished) {
          clearInterval(intervalId);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "An error occurred");
        setLoading(false);
      }
    };

    void fetchBatchStatus();
    intervalId = setInterval(fetchBatchStatus, 3000);

    return () => clearInterval(intervalId);
  }, [batchId]);

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 md:px-8 max-w-[1000px] mx-auto flex flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-650 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-500">Loading batch details...</p>
      </main>
    );
  }

  if (errorMessage || !batch) {
    return (
      <main className="min-h-screen px-4 py-8 md:px-8 max-w-[1000px] mx-auto space-y-6">
        <div className="mb-8">
          <Link href="/generate" className="text-sm font-semibold text-sky-700 hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-250 text-rose-800 text-sm">
          {errorMessage || "Batch not found."}
        </div>
      </main>
    );
  }

  const completedPct = batch.total_count > 0 
    ? Math.round(((batch.completed_count + batch.failed_count) / batch.total_count) * 100) 
    : 0;

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 lg:px-12 max-w-[1000px] mx-auto space-y-8">
      <title>{batch.name || "Batch Status"}</title>

      <div className="flex items-center justify-between gap-4">
        <Link href="/generate" className="text-sm font-semibold text-sky-700 hover:underline">
          &larr; Back to Dashboard
        </Link>
        <Link href="/generate/batch" className="text-sm font-semibold text-sky-700 hover:underline">
          Create New Batch &rarr;
        </Link>
      </div>

      {/* Batch Summary Card */}
      <div className="glass-card rounded-3xl p-6 md:p-8 bg-white/80 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight" id="batch-title">
              {batch.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Batch ID: {batch._id} &bull; Created: {new Date(batch.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-3 text-center">
            <div className="px-3 py-1.5 bg-slate-100 rounded-xl">
              <div className="text-lg font-bold text-slate-700">{batch.total_count}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</div>
            </div>
            <div className="px-3 py-1.5 bg-emerald-50 rounded-xl">
              <div className="text-lg font-bold text-emerald-700">{batch.completed_count}</div>
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Done</div>
            </div>
            <div className="px-3 py-1.5 bg-rose-50 rounded-xl">
              <div className="text-lg font-bold text-rose-700">{batch.failed_count}</div>
              <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Failed</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-650">
            <span>Overall Progress</span>
            <span>{completedPct}% Completed</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-650 h-full transition-all duration-500 ease-out" 
              style={{ width: `${completedPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Jobs Details List */}
      <div className="glass-card rounded-3xl bg-white/85 overflow-hidden shadow-sm border border-slate-150">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-md font-bold text-slate-800">Job Executions ({jobs.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm" id="batch-jobs-table">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 font-semibold bg-slate-50/20">
                <th className="px-6 py-3">Topic</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Current Step</th>
                <th className="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {jobs.map((job) => {
                let statusBadge = "";
                let statusText = job.status;

                switch (job.status) {
                  case "completed":
                    statusBadge = "bg-emerald-100 text-emerald-800 border-emerald-200";
                    break;
                  case "failed":
                    statusBadge = "bg-rose-100 text-rose-800 border-rose-200";
                    break;
                  case "processing":
                    statusBadge = "bg-amber-100 text-amber-855 border-amber-200 animate-pulse";
                    break;
                  case "scheduled":
                    statusBadge = "bg-sky-100 text-sky-850 border-sky-200";
                    break;
                  default:
                    statusBadge = "bg-slate-100 text-slate-600 border-slate-200";
                    break;
                }

                return (
                  <tr key={job._id} className="hover:bg-slate-50/40 transition">
                    <td className="px-6 py-4 font-semibold text-slate-850 max-w-[300px] truncate" title={job.topic}>
                      {job.topic}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge}`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-505 capitalize">
                      {job.status === "processing" ? (
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                          {job.current_step}
                        </span>
                      ) : job.status === "completed" ? (
                        "done"
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {job.status === "completed" && job.result_article_id ? (
                        <Link 
                          href={`/generate/job/${job._id}`}
                          className="text-sky-700 hover:underline font-semibold"
                        >
                          View Article &rarr;
                        </Link>
                      ) : job.status === "failed" ? (
                        <span className="text-rose-650" title={job.error_message || "Error occurred"}>
                          Error: {job.error_message ? (job.error_message.length > 50 ? `${job.error_message.slice(0, 50)}...` : job.error_message) : "Failed"}
                        </span>
                      ) : job.status === "scheduled" && job.scheduled_at ? (
                        <span className="text-slate-400">
                          Scheduled: {new Date(job.scheduled_at).toLocaleString()}
                        </span>
                      ) : job.status === "processing" ? (
                        <Link 
                          href={`/generate/job/${job._id}`}
                          className="text-amber-705 hover:underline font-semibold"
                        >
                          Track progress &rarr;
                        </Link>
                      ) : (
                        <span className="text-slate-400">Waiting...</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
