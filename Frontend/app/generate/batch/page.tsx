"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STAGGER_OPTIONS = [
  { label: "Run all immediately (no stagger)", value: "none" },
  { label: "Every 30 minutes", value: "30" },
  { label: "Every hour", value: "60" },
  { label: "Thrice a day (every 8 hours)", value: "480" },
  { label: "Twice a day (every 12 hours)", value: "720" },
  { label: "Once a day (every 24 hours)", value: "1440" },
  { label: "Custom interval...", value: "custom" },
];

export default function BatchGeneratePage() {
  const router = useRouter();
  const [batchName, setBatchName] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [staggerPattern, setStaggerPattern] = useState("none");
  const [customMinutes, setCustomMinutes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [autoPublish, setAutoPublish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Split topics by line, trim whitespace, ignore empty lines
    const topics = topicsText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (topics.length === 0) {
      setErrorMessage("Please enter at least one topic.");
      return;
    }

    setLoading(true);

    try {
      let isoScheduledAt = "";
      if (scheduledAt) {
        isoScheduledAt = new Date(scheduledAt).toISOString();
      }

      let staggerVal = null;
      if (staggerPattern === "custom") {
        staggerVal = customMinutes ? parseInt(customMinutes, 10) : null;
      } else if (staggerPattern !== "none") {
        staggerVal = parseInt(staggerPattern, 10);
      }

      const response = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics,
          name: batchName.trim() || null,
          scheduled_at: isoScheduledAt || null,
          stagger_minutes: staggerVal,
          auto_publish: autoPublish,
          image_source: "stock",
          include_inline_styles: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit batch request");
      }

      if (data.batch_id) {
        router.push(`/generate/batch/${data.batch_id}`);
      } else {
        throw new Error("Failed to retrieve batch ID");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 lg:px-12 max-w-[800px] mx-auto">
      <title>Batch Article Generation</title>
      
      <div className="mb-8">
        <Link href="/generate" className="text-sm font-semibold text-sky-700 hover:underline flex items-center gap-1">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="glass-card rounded-3xl p-6 md:p-8 bg-white/80 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight" id="batch-page-title">
            Batch Article Generator
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Queue or schedule multiple articles at once by listing topics one per line.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-250 text-rose-800 text-sm" id="batch-submit-error">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="batch-name" className="text-sm font-semibold text-slate-700">
              Batch Name (Optional)
            </label>
            <input
              id="batch-name"
              type="text"
              placeholder="e.g. SEO Campaign Q3"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-sky-500 focus:border-sky-500 focus:ring-1"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="batch-topics" className="text-sm font-semibold text-slate-700">
              Topics (One per line)
            </label>
            <textarea
              id="batch-topics"
              rows={8}
              placeholder="Enter article topics here...&#10;e.g. Best Python Frameworks in 2026&#10;How to Deploy FastAPI to Production&#10;MongoDB Indexing Best Practices"
              value={topicsText}
              onChange={(e) => setTopicsText(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none ring-sky-500 focus:border-sky-500 focus:ring-1 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="stagger-pattern" className="text-sm font-semibold text-slate-700">
                Stagger Frequency / Interval
              </label>
              <select
                id="stagger-pattern"
                value={staggerPattern}
                onChange={(e) => {
                  setStaggerPattern(e.target.value);
                  if (e.target.value !== "custom") {
                    setCustomMinutes("");
                  }
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-sky-500 focus:border-sky-500 focus:ring-1"
              >
                {STAGGER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {staggerPattern === "custom" && (
                <div className="flex flex-col gap-1 mt-2">
                  <label htmlFor="custom-minutes" className="text-xs font-semibold text-slate-500">
                    Custom Interval (Minutes)
                  </label>
                  <input
                    id="custom-minutes"
                    type="number"
                    min="1"
                    placeholder="e.g. 90"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    required
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none ring-sky-500 focus:border-sky-500 focus:ring-1"
                  />
                </div>
              )}
              <span className="text-[11px] text-slate-400">
                Interval between starting each article (e.g. "1 every 30 minutes").
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="schedule-time" className="text-sm font-semibold text-slate-700">
                Start Date/Time (Optional)
              </label>
              <input
                id="schedule-time"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-sky-500 focus:border-sky-500 focus:ring-1"
              />
              <span className="text-[11px] text-slate-400">
                Leave blank to start executing the first job immediately.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <input
              id="auto-publish-batch"
              type="checkbox"
              checked={autoPublish}
              onChange={(e) => setAutoPublish(e.target.checked)}
              className="h-4 w-4 rounded border-slate-350 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="auto-publish-batch" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
              🚀 Automatically publish successfully generated articles
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !topicsText.trim()}
            className="w-full inline-flex items-center justify-center rounded-xl bg-slatebrand hover:bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            id="batch-submit-btn"
          >
            {loading ? "Creating Batch Job..." : "Submit Batch Job"}
          </button>
        </form>
      </div>
    </main>
  );
}
