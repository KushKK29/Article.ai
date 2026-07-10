"use client";

import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap"
});

const STAGGER_OPTIONS = [
  { label: "Run all immediately (no stagger)", value: "none" },
  { label: "Every 30 minutes", value: "30" },
  { label: "Every hour", value: "60" },
  { label: "Thrice a day (every 8 hours)", value: "480" },
  { label: "Twice a day (every 12 hours)", value: "720" },
  { label: "Once a day (every 24 hours)", value: "1440" },
  { label: "Custom interval...", value: "custom" }
];

const IMAGE_SOURCE_OPTIONS = [
  { label: "Unsplash", value: "unsplash", description: "Open editorial stock imagery." },
  { label: "Google Images", value: "google", description: "Broader search coverage." }
];

const PREVIEW_LIMIT = 5;

function formatPreviewTime(time: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(time);
}

export default function BatchGeneratePage() {
  const router = useRouter();
  const [batchName, setBatchName] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [staggerPattern, setStaggerPattern] = useState("none");
  const [customMinutes, setCustomMinutes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [autoPublish, setAutoPublish] = useState(false);
  const [imageSource, setImageSource] = useState<"unsplash" | "google">("unsplash");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [wordCountTarget, setWordCountTarget] = useState(1500);
  const [imageCount, setImageCount] = useState(5);
  const [imageSpacing, setImageSpacing] = useState(2);

  const topics = useMemo(
    () =>
      topicsText
        .split("\n")
        .map((topic) => topic.trim())
        .filter((topic) => topic.length > 0),
    [topicsText]
  );

  const resolvedStaggerMinutes = useMemo(() => {
    if (staggerPattern === "custom") {
      const parsed = Number.parseInt(customMinutes, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    if (staggerPattern === "none") {
      return null;
    }

    const parsed = Number.parseInt(staggerPattern, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [customMinutes, staggerPattern]);

  const canPreviewSchedule =
    scheduledAt.length > 0 && topics.length > 0 && (staggerPattern !== "custom" || resolvedStaggerMinutes !== null);

  const schedulePreview = useMemo(() => {
    if (!canPreviewSchedule) {
      return [] as string[];
    }

    const baseTime = new Date(scheduledAt);
    if (Number.isNaN(baseTime.getTime())) {
      return [] as string[];
    }

    return topics.map((_, index) => {
      const scheduledTime = new Date(baseTime.getTime());
      if (resolvedStaggerMinutes && resolvedStaggerMinutes > 0) {
        scheduledTime.setMinutes(scheduledTime.getMinutes() + index * resolvedStaggerMinutes);
      }
      return formatPreviewTime(scheduledTime);
    });
  }, [canPreviewSchedule, resolvedStaggerMinutes, scheduledAt, topics]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

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

      let staggerVal: number | null = null;
      if (staggerPattern === "custom") {
        staggerVal = customMinutes ? Number.parseInt(customMinutes, 10) : null;
      } else if (staggerPattern !== "none") {
        staggerVal = Number.parseInt(staggerPattern, 10);
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
          image_source: imageSource,
          include_inline_styles: true,
          word_count_target: wordCountTarget,
          image_count: imageCount,
          image_spacing: imageSpacing
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
    <main className="min-h-screen bg-[var(--paper)] px-4 py-8 text-[var(--ink)] md:px-8 lg:px-12">
      <title>Galley Tray | ArticleShip</title>

      <div className="mx-auto mb-8 max-w-[920px]">
        <Link href="/generate" className="flex items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="mx-auto max-w-[920px] space-y-6">
        <section className="space-y-6 border-2 border-[var(--ink)] bg-[var(--plate)] p-6 shadow-[6px_6px_0px_var(--press-dark)] md:p-8">
          <div className="space-y-3">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[var(--accent)]">
              Submissions Queue
            </p>
            <h1
              className={`${playfairDisplay.className} text-3xl font-normal tracking-tight text-[var(--ink)] md:text-4xl`}
              id="batch-page-title"
            >
              Galley Tray
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)]">
              Queue multiple articles at once, assign a publication decision, and preview the exact run order before it goes to press.
            </p>
          </div>

          {errorMessage && (
            <div className="border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800" id="batch-submit-error">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="batch-name" className="text-sm font-semibold text-[var(--ink)]">
                Batch Name (Optional)
              </label>
              <input
                id="batch-name"
                type="text"
                placeholder="e.g. SEO Campaign Q3"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-[var(--paper)] px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="batch-topics" className="text-sm font-semibold text-[var(--ink)]">
                Topics (One per line)
              </label>
              <textarea
                id="batch-topics"
                rows={8}
                placeholder="Enter article topics here...&#10;e.g. Best Python Frameworks in 2026&#10;How to Deploy FastAPI to Production&#10;MongoDB Indexing Best Practices"
                value={topicsText}
                onChange={(e) => setTopicsText(e.target.value)}
                required
                className="font-mono w-full border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="stagger-pattern" className="text-sm font-semibold text-[var(--ink)]">
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
                  className="border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-[var(--paper)] px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
                >
                  {STAGGER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {staggerPattern === "custom" && (
                  <div className="mt-2 flex flex-col gap-1">
                    <label htmlFor="custom-minutes" className="text-xs font-semibold text-[var(--ink-muted)]">
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
                      className="border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-[var(--paper)] px-4 py-2 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
                    />
                  </div>
                )}
                <span className="text-[11px] text-[var(--ink-muted)]">Interval between starting each article.</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="schedule-time" className="text-sm font-semibold text-[var(--ink)]">
                  Start Date/Time (Optional)
                </label>
                <input
                  id="schedule-time"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-[var(--paper)] px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
                />
                <span className="text-[11px] text-[var(--ink-muted)]">Leave blank to start executing the first job immediately.</span>
              </div>
            </div>

            {schedulePreview.length > 0 && (
              <div className="border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)]">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[var(--accent)]">
                  Schedule Preview
                </p>
                <p className="mt-2 leading-relaxed text-[var(--ink-muted)]">
                  {schedulePreview.slice(0, PREVIEW_LIMIT).map((time, index) => (
                    <span key={`${time}-${index}`}>
                      Job {index + 1} — {time}
                      {index < Math.min(schedulePreview.length, PREVIEW_LIMIT) - 1 ? " · " : ""}
                    </span>
                  ))}
                  {schedulePreview.length > PREVIEW_LIMIT ? ` · …and ${schedulePreview.length - PREVIEW_LIMIT} more` : ""}
                </p>
              </div>
            )}

            {!scheduledAt && topics.length > 0 && (
              <div className="border border-dashed border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink-muted)]">
                Set a start time to preview the run order.
              </div>
            )}

            {/* Composition Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pt-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="word-count-select" className="text-sm font-semibold text-[var(--ink)]">
                  Target Length
                </label>
                <select
                  id="word-count-select"
                  value={wordCountTarget}
                  onChange={(e) => setWordCountTarget(Number(e.target.value))}
                  className="border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-[var(--paper)] px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)]"
                >
                  <option value={500}>500 words (Brief / Flat)</option>
                  <option value={1000}>1000 words (Standard Short)</option>
                  <option value={1500}>1500 words (Default Deep)</option>
                  <option value={2500}>2500 words (Comprehensive / Pillar)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="image-count-input" className="text-sm font-semibold text-[var(--ink)]">
                  Image Count (0-15)
                </label>
                <input
                  id="image-count-input"
                  type="number"
                  min={0}
                  max={15}
                  value={imageCount}
                  onChange={(e) => setImageCount(Math.min(15, Math.max(0, Number(e.target.value))))}
                  className="border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-[var(--paper)] px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="image-spacing-input" className="text-sm font-semibold text-[var(--ink)]">
                  Image Spacing
                </label>
                <input
                  id="image-spacing-input"
                  type="number"
                  min={1}
                  value={imageSpacing}
                  onChange={(e) => setImageSpacing(Math.max(1, Number(e.target.value)))}
                  className="border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-[var(--paper)] px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)]"
                />
                <span className="text-[11px] text-[var(--ink-muted)]">
                  Insert 1 image every {imageSpacing} headings.
                </span>
              </div>
            </div>

            <fieldset className="space-y-3 border-t border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pt-4">
              <legend className="text-sm font-semibold text-[var(--ink)]">Image Source</legend>
              <div className="grid gap-3 md:grid-cols-2">
                {IMAGE_SOURCE_OPTIONS.map((option) => {
                  const checked = imageSource === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer border-2 px-4 py-3 transition ${
                        checked ? "border-[var(--accent)] bg-[#E8EEFF]" : "border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[var(--plate)] hover:border-[color-mix(in_srgb,var(--accent)_50%,transparent)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="image-source"
                        value={option.value}
                        checked={checked}
                        onChange={() => setImageSource(option.value as "unsplash" | "google")}
                        className="sr-only"
                      />
                      <span className="block text-sm font-semibold text-[var(--ink)]">{option.label}</span>
                      <span className="mt-1 block text-xs text-[var(--ink-muted)]">{option.description}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex items-center gap-3 border-t border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pt-4">
              <input
                id="auto-publish-batch"
                type="checkbox"
                checked={autoPublish}
                onChange={(e) => setAutoPublish(e.target.checked)}
                className="h-4 w-4 border-[color-mix(in_srgb,var(--ink)_15%,transparent)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <label htmlFor="auto-publish-batch" className="cursor-pointer select-none text-sm font-semibold text-[var(--ink)]">
                Send each successful article straight to publication
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || topics.length === 0}
              className="inline-flex w-full items-center justify-center border-2 border-[var(--ink)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-50"
              id="batch-submit-btn"
            >
              {loading ? "Creating Batch Job..." : "Submit Batch Job"}
            </button>
          </form>
        </section>

        <section className="border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[var(--paper)] px-5 py-4 text-sm text-[var(--ink-muted)]">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Run Notes</p>
          <p className="mt-2 leading-relaxed">
            Unsplash and Google Images now map directly to the backend provider values. The schedule preview uses the same start-time plus stagger logic the job queue applies on submission.
          </p>
        </section>
      </div>
    </main>
  );
}
