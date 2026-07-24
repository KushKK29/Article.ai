"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ArticleEditor from "@/components/ArticleEditor";
import ImageGallery from "@/components/ImageGallery";
import KeywordsPanel from "@/components/KeywordsPanel";
import SavedArticleWorkbench, { type SavedArticleRecord } from "@/components/SavedArticleWorkbench";
import StructureViewer from "@/components/StructureViewer";
import TopicInput from "@/components/TopicInput";
import {
  ArticleStructure,
  ContentBlock,
  GenerateApiResponse,
  ImageItem,
  KeywordBundle,
  ToastMessage,
  ToastType
} from "@/lib/types";
import { useAuthFetch } from "@/lib/useAuthFetch";
import RequireAuth from "@/components/RequireAuth";

const STEPS = ["Generating keywords", "Building structure", "Writing article", "Generating images"];
const AUTOSAVE_INTERVAL_MS = 25000;

type SavedArticle = SavedArticleRecord;

function buildMarkdown(blocks: ContentBlock[]) {
  return blocks
    .map((block) => {
      const heading = block.heading?.trim() ? block.heading : `${"#".repeat(Math.max(block.level, 1))} Section`;
      return `${heading}\n\n${block.content ?? ""}`.trim();
    })
    .join("\n\n");
}

function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="skeleton h-5 w-1/3 rounded" />
      <div className="mt-4 space-y-2">
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-11/12 rounded" />
        <div className="skeleton h-4 w-4/5 rounded" />
      </div>
    </div>
  );
}

function Sparkline({ views }: { views: number }) {
  const points = useMemo(() => {
    if (views === 0) return "0,20 10,20 20,20 30,20 40,20 50,20 60,20";
    let pts = "";
    // pseudo-random generation based on views to look like a trend
    for (let i = 0; i <= 6; i++) {
      const mod = (views * (i + 1)) % 15;
      const y = Math.max(2, 20 - mod - (views > 100 && i > 3 ? 5 : 0));
      pts += `${i * 10},${y} `;
    }
    return pts.trim();
  }, [views]);

  return (
    <svg viewBox="0 -5 60 30" className="h-6 w-16 overflow-visible text-emerald-500">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ToastBar({
  toasts,
  removeToast
}: {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed right-4 top-4 z-50 flex w-[330px] flex-col gap-2">
      {toasts.map((toast) => {
        const tone: Record<ToastType, string> = {
          success: "border-[#0B132B] bg-[var(--highlight)] text-[#0B132B] shadow-[2px_2px_0px_var(--ink)]",
          error: "border-[var(--ink)] bg-rose-50 text-rose-800 shadow-[2px_2px_0px_var(--ink)]",
          info: "border-[var(--ink)] bg-sky-50 text-[var(--accent-deep)] shadow-[2px_2px_0px_var(--ink)]"
        };
        return (
          <div
            key={toast.id}
            className={`rounded-none border-2 px-4 py-3 text-xs font-mono uppercase tracking-wider ${tone[toast.type]}`}
            role="status"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">{toast.title}</p>
                {toast.description ? <p className="text-[10px] mt-1 normal-case font-sans text-[var(--ink-muted)]">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-[10px] font-bold underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  return (
    <RequireAuth>
      <HomePageContent />
    </RequireAuth>
  );
}

function HomePageContent() {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState<KeywordBundle | null>(null);
  const [structure, setStructure] = useState<ArticleStructure | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState<"dashboard" | "articles">("dashboard");
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [savedArticlesLoading, setSavedArticlesLoading] = useState(true);
  const [savedArticlesFetchFailed, setSavedArticlesFetchFailed] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>("");
  const [isPersistingDraft, setIsPersistingDraft] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [autoPublish, setAutoPublish] = useState(false);
  const [scheduledJobs, setScheduledJobs] = useState<any[]>([]);
  const [autoFocusOnLoad, setAutoFocusOnLoad] = useState(false);
  const [wordCountTarget, setWordCountTarget] = useState(1500);
  const [imageCount, setImageCount] = useState(5);
  const [imageSpacing, setImageSpacing] = useState(2);
  const autosaveErrorAtRef = useRef(0);

  const currentDraftPayload = useMemo(
    () => ({
      meta,
      keywords,
      structure,
      content,
      blocks,
      images
    }),
    [meta, keywords, structure, content, blocks, images]
  );

  const currentSnapshot = useMemo(
    () => JSON.stringify({ topic: topic.trim(), payload: currentDraftPayload }),
    [topic, currentDraftPayload]
  );

  const canPersistDraft = topic.trim().length > 0 && blocks.length > 0;
  const hasUnsavedChanges = canPersistDraft && currentSnapshot !== lastSavedSnapshot;

  const publishedArticles = useMemo(
    () => savedArticles.filter((article) => article.status === "published"),
    [savedArticles]
  );

  const analyticsFunnel = useMemo(() => {
    const totalDrafts = savedArticles.length - publishedArticles.length;
    const publishedRatio = savedArticles.length > 0 ? Math.round((publishedArticles.length / savedArticles.length) * 100) : 0;
    
    let timeSum = 0;
    let timeCount = 0;
    const keywordCounts: Record<string, number> = {};

    publishedArticles.forEach(a => {
      if (a.createdAt && a.publishedAt) {
        const diff = new Date(a.publishedAt).getTime() - new Date(a.createdAt).getTime();
        if (diff > 0) {
          timeSum += diff;
          timeCount++;
        }
      }
      const pk = (a.payload?.keywords as any)?.primary_keyword;
      if (pk && typeof pk === "string") {
        keywordCounts[pk] = (keywordCounts[pk] || 0) + (a.viewCount || 0);
      }
    });

    const avgMs = timeCount > 0 ? timeSum / timeCount : 0;
    const avgHours = Math.round(avgMs / (1000 * 60 * 60));
    const avgPublishTimeText = avgHours > 24 ? `${Math.round(avgHours / 24)} days` : `${avgHours} hours`;
    const topKeywords = Object.entries(keywordCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return { totalDrafts, publishedRatio, avgPublishTimeText, topKeywords, timeCount };
  }, [savedArticles, publishedArticles]);

  const addToast = (type: ToastType, title: string, description?: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3800);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  const resetDraftComposer = () => {
    setCurrentDraftId(null);
    setLastSavedSnapshot("");
    setTopic("");
    setKeywords(null);
    setStructure(null);
    setMeta(null);
    setContent("");
    setImages([]);
    setBlocks([]);
  };

  const confirmDiscardChanges = () => {
    if (!hasUnsavedChanges) return true;
    return window.confirm("You have unsaved changes. Leave this draft without saving?");
  };

  const fetchSavedArticles = async () => {
    setSavedArticlesLoading(true);
    setSavedArticlesFetchFailed(false);

    try {
      const response = await authFetch("/api/save-article", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load saved articles");
      }

      const data = await response.json();
      setSavedArticles(data.articles ?? []);
      setSelectedArticleId((currentSelected) => {
        if (!currentSelected) return data.articles?.[0]?.id ?? null;
        return data.articles?.some((article: SavedArticle) => article.id === currentSelected)
          ? currentSelected
          : data.articles?.[0]?.id ?? null;
      });
    } catch {
      setSavedArticlesFetchFailed(true);
      addToast("error", "Could not load saved articles");
    } finally {
      setSavedArticlesLoading(false);
    }
  };

  useEffect(() => {
    void fetchSavedArticles().then(() => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const articleId = params.get("articleId");
        if (articleId) {
          setSelectedArticleId(articleId);
          setActiveTab("articles");
          setAutoFocusOnLoad(true);
          // Remove query param without refreshing
          window.history.replaceState({}, "", "/generate");
        }
      }
    });
  }, []);

  const persistCurrentDraft = useCallback(
    async (source: "manual" | "autosave") => {
      if (!canPersistDraft) {
        if (source === "manual") {
          addToast("error", "Nothing to save", "Generate and edit article first");
        }
        return false;
      }

      setIsPersistingDraft(true);

      try {
        const payload = {
          topic,
          payload: currentDraftPayload
        };

        let response: Response;

        if (currentDraftId) {
          response = await authFetch(`/api/articles/${currentDraftId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (response.status === 404) {
            response = await authFetch("/api/save-article", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
          }
        } else {
          response = await authFetch("/api/save-article", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        }

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.detail || data?.error || "Save failed");
        }

        const nextId = data?.article?.id;
        if (typeof nextId === "string" && nextId.length > 0) {
          setCurrentDraftId(nextId);
        }
        setLastSavedSnapshot(currentSnapshot);

        if (source === "manual") {
          addToast("success", "Draft saved", "Stored in backend MongoDB as a draft");
          await fetchSavedArticles();
        }

        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save draft";

        if (source === "manual") {
          addToast("error", "Could not save article", message);
        } else {
          const now = Date.now();
          if (now - autosaveErrorAtRef.current > 30000) {
            addToast("error", "Autosave failed", "We could not save your latest changes.");
            autosaveErrorAtRef.current = now;
          }
        }

        return false;
      } finally {
        setIsPersistingDraft(false);
      }
    },
    [addToast, authFetch, canPersistDraft, currentDraftId, currentDraftPayload, currentSnapshot, fetchSavedArticles, topic]
  );

  useEffect(() => {
    if (!hasUnsavedChanges || loading || isPersistingDraft) {
      return;
    }

    const timer = setInterval(() => {
      void persistCurrentDraft("autosave");
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [hasUnsavedChanges, isPersistingDraft, loading]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const fetchScheduledJobs = async () => {
    try {
      const response = await authFetch("/api/jobs?status=scheduled", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setScheduledJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Failed to fetch scheduled jobs:", err);
    }
  };

  useEffect(() => {
    fetchScheduledJobs();
  }, []);

  const handleSchedule = async () => {
    if (!topic.trim() || !scheduledAt) {
      addToast("error", "Invalid Submission", "Topic and scheduled time are required");
      return;
    }
    setLoading(true);
    try {
      const localDate = new Date(scheduledAt);
      const isoString = localDate.toISOString();

      const response = await authFetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          scheduled_at: isoString,
          auto_publish: autoPublish,
          image_source: aiGenerated ? "ai_generated" : "stock",
          word_count_target: wordCountTarget,
          image_count: imageCount,
          image_spacing: imageSpacing
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to schedule article");
      }

      addToast("success", "Article Scheduled", `Article has been successfully scheduled for ${localDate.toLocaleString()}`);
      setTopic("");
      setIsScheduled(false);
      setScheduledAt("");
      setAutoPublish(false);
      
      await fetchScheduledJobs();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown scheduling error";
      addToast("error", "Scheduling Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const response = await authFetch(`/api/jobs/${jobId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        addToast("success", "Job Cancelled", "The scheduled article generation was cancelled.");
        await fetchScheduledJobs();
      } else {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to cancel job");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addToast("error", "Cancellation Failed", message);
    }
  };

  const generate = async () => {
    if (!topic.trim()) {
      addToast("error", "Topic is required", "Enter a topic before generating");
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          ai_generated: aiGenerated,
          word_count_target: wordCountTarget,
          image_count: imageCount,
          image_spacing: imageSpacing
        })
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: "Generation failed" }));
        if (response.status === 402) {
          addToast("error", "Free tier limit reached", "Upgrade your plan to keep generating articles.");
          router.push("/pricing");
          setLoading(false);
          return;
        }
        throw new Error(errorPayload.error || "Generation failed");
      }

      const data = await response.json();
      if (data.job_id) {
        addToast("success", "Job submitted", "Redirecting to tracking page...");
        router.push(`/generate/job/${data.job_id}`);
      } else {
        throw new Error(data.error || "Failed to submit job");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      addToast("error", "Submission failed", message);
      setLoading(false);
    }
  };

  const saveArticle = async () => {
    await persistCurrentDraft("manual");
  };

  const publishArticle = async (articleId: string) => {
    try {
      const response = await authFetch(`/api/articles/${articleId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Publish failed");
      }

      addToast("success", "Article published", "Live page and slug are now active");
      await fetchSavedArticles();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publish failed";
      addToast("error", "Publish failed", message);
    }
  };

  const updateArticle = async (articleId: string, nextTopic: string, nextPayload: Record<string, unknown>) => {
    try {
      const response = await authFetch(`/api/articles/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: nextTopic, payload: nextPayload })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Update failed");
      }

      addToast("success", "Article updated", "Saved changes reset publish state to draft");
      await fetchSavedArticles();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      addToast("error", "Could not save changes", message);
    }
  };

  const deleteArticle = async (articleId: string) => {
    try {
      const response = await authFetch(`/api/articles/${articleId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Delete failed");
      }

      if (selectedArticleId === articleId) {
        setSelectedArticleId(null);
      }
      if (currentDraftId === articleId) {
        setCurrentDraftId(null);
        setLastSavedSnapshot("");
      }
      addToast("success", "Article deleted", "Removed from MongoDB and the editor list");
      await fetchSavedArticles();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      addToast("error", "Could not delete article", message);
    }
  };

  const downloadMarkdown = () => {
    if (!blocks.length) {
      addToast("error", "No article to download");
      return;
    }
    const markdown = buildMarkdown(blocks);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "article"}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    addToast("success", "Markdown downloaded");
  };

  const downloadPdf = () => {
    if (!content) {
      addToast("error", "No article to export", "Generate content before PDF download");
      return;
    }

    const title = topic || "ArticleShip Article";
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument;
    if (!frameDoc) {
      iframe.remove();
      addToast("error", "PDF export failed", "Unable to create print frame");
      return;
    }

    frameDoc.open();
    frameDoc.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 28px; }
            .article-title { text-align: center; font-size: 42px; line-height: 1.08; margin-bottom: 16px; }
            .section-title { margin: 18px 0 12px; }
            .content-text, p { line-height: 1.7; color: #334155; }
            .article-image { width: min(72%, 760px); display: block; margin: 10px auto 12px; border-radius: 12px; }
            .image-credit { text-align: center; color: #64748b; font-size: 12px; margin-bottom: 12px; }
            .article-link { color: #0369a1; }
            @media print { body { margin: 12mm; } }
          </style>
        </head>
        <body>
          <article>${content}</article>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        iframe.remove();
        addToast("error", "PDF export failed", "Unable to open print dialog");
        return;
      }
      frameWindow.focus();
      frameWindow.print();
      setTimeout(() => iframe.remove(), 1500);
    }, 250);
    addToast("info", "Print dialog opened", "Choose Save as PDF in destination");
  };

  const displaySteps = useMemo(() => {
    return loading ? currentStep : currentStep > 0 ? STEPS.length : 0;
  }, [loading, currentStep]);

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] px-6 py-12 md:px-12 font-serif selection:bg-[var(--highlight)] selection:text-[#0B132B]">
      <ToastBar toasts={toasts} removeToast={removeToast} />

      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] items-start">
        {/* Sidebar Column */}
        <div className="space-y-6">
          <aside className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-5 shadow-[3px_3px_0px_var(--press-dark)]">
            <h2 className="mb-4 text-lg font-extrabold tracking-tight border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-3 uppercase text-[var(--ink)]">
              Manuscript Desk
            </h2>
            <nav className="space-y-2 text-xs font-mono uppercase tracking-wider font-bold">
              <button
                type="button"
                onClick={() => {
                  if (activeTab !== "dashboard" && !confirmDiscardChanges()) return;
                  setActiveTab("dashboard");
                }}
                className={`w-full rounded-none border-2 px-4 py-2.5 text-left transition ${
                  activeTab === "dashboard"
                    ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)] shadow-[2px_2px_0px_rgba(29,78,216,1)]"
                    : "bg-[var(--plate)] border-transparent text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
                }`}
              >
                Desk Overview
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeTab !== "articles" && !confirmDiscardChanges()) return;
                  setActiveTab("articles");
                }}
                className={`w-full rounded-none border-2 px-4 py-2.5 text-left transition ${
                  activeTab === "articles"
                    ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)] shadow-[2px_2px_0px_rgba(29,78,216,1)]"
                    : "bg-[var(--plate)] border-transparent text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
                }`}
              >
                Manuscript Archive
              </button>
              <Link
                href="/generate/batch"
                className="block w-full rounded-none border-2 border-transparent px-4 py-2.5 text-left transition text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
              >
                Batch Queue
              </Link>
              <Link
                href="/articles"
                className="block w-full rounded-none border-2 border-[var(--ink)] px-4 py-2.5 text-left transition text-[var(--accent-deep)] hover:bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] font-bold shadow-[2px_2px_0px_var(--ink)] hover:shadow-none"
              >
                Live Blog Archive &rarr;
              </Link>
            </nav>
          </aside>

          {activeTab === "articles" ? (
            <aside className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-6 shadow-[3px_3px_0px_var(--press-dark)] xl:max-h-[calc(100vh-220px)] xl:overflow-hidden">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-3">
                <h2 className="text-md font-extrabold uppercase text-[var(--ink)]">Manuscripts</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmDiscardChanges()) return;
                    setSelectedArticleId(null);
                    resetDraftComposer();
                  }}
                  className="rounded-none border-2 border-[var(--ink)] bg-[var(--plate)] px-3 py-1 text-[10px] font-mono font-bold uppercase text-[var(--ink)] shadow-[1.5px_1.5px_0px_var(--ink)] hover:shadow-none transition-all active:translate-x-0.5 active:translate-y-0.5"
                >
                  New Draft
                </button>
              </div>

              {savedArticlesLoading ? (
                <div className="space-y-3">
                  <div className="h-16 w-full bg-[var(--paper)] border-2 border-[color-mix(in_srgb,var(--ink)_10%,transparent)] animate-pulse" />
                  <div className="h-16 w-full bg-[var(--paper)] border-2 border-[color-mix(in_srgb,var(--ink)_10%,transparent)] animate-pulse" />
                </div>
              ) : savedArticlesFetchFailed ? (
                <p className="text-xs font-mono uppercase text-rose-700">Failed to load manuscript queue.</p>
              ) : savedArticles.length === 0 ? (
                <p className="text-xs font-mono uppercase text-[var(--ink-muted)]">No manuscripts generated yet.</p>
              ) : (
                <ul className="space-y-3 xl:max-h-[calc(100vh-320px)] xl:overflow-y-auto xl:pr-1">
                  {savedArticles.map((article) => {
                    const isSelected = article.id === selectedArticleId;
                    return (
                      <li
                        key={article.id}
                        className={`rounded-none border-2 bg-[var(--plate)] p-3 transition ${
                          isSelected ? "border-[var(--accent)] shadow-[2.5px_2.5px_0px_rgba(29,78,216,1)]" : "border-[var(--ink)] hover:shadow-[2px_2px_0px_var(--ink)]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (!confirmDiscardChanges()) return;
                            setSelectedArticleId(article.id);
                          }}
                          className="w-full text-left font-mono"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--ink)_5%,transparent)] pb-1">
                            <span className="font-bold text-[var(--ink)] text-xs leading-tight truncate max-w-[130px]">{article.topic}</span>
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-bold border border-[color-mix(in_srgb,var(--ink)_20%,transparent)] uppercase tracking-wide ${
                                article.status === "published"
                                  ? "bg-slate-100 text-[var(--ink)]"
                                  : "bg-[var(--highlight)] text-[#0B132B]"
                              }`}
                            >
                              {article.status || "draft"}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-[var(--ink-muted)]">{new Date(article.createdAt).toLocaleString()}</p>
                          {article.status === "published" ? (
                            <p className="mt-1 text-[10px] font-bold text-[var(--accent-deep)]">VIEWS: {(article.viewCount ?? 0).toLocaleString()}</p>
                          ) : null}
                          {article.slug ? (
                            <a
                              href={`/blog/${article.slug}`}
                              className="mt-2 inline-block text-[10px] font-bold text-[var(--accent)] underline hover:text-[var(--accent-deep)]"
                              onClick={(event) => event.stopPropagation()}
                            >
                              Open Live Proof
                            </a>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </aside>
          ) : null}
        </div>

        {/* Content Column */}
        {activeTab === "dashboard" ? (
          <section className="space-y-8">
            <TopicInput
              topic={topic}
              setTopic={setTopic}
              onGenerate={generate}
              loading={loading}
              currentStep={displaySteps}
              steps={STEPS}
              isScheduled={isScheduled}
              setIsScheduled={setIsScheduled}
              scheduledAt={scheduledAt}
              setScheduledAt={setScheduledAt}
              autoPublish={autoPublish}
              setAutoPublish={setAutoPublish}
              onSchedule={handleSchedule}
              wordCountTarget={wordCountTarget}
              setWordCountTarget={setWordCountTarget}
              imageCount={imageCount}
              setImageCount={setImageCount}
              imageSpacing={imageSpacing}
              setImageSpacing={setImageSpacing}
            />

            {/* AI Image toggle */}
            <div className="flex items-center gap-3 bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-4 shadow-[3px_3px_0px_var(--press-dark)]">
              <button
                id="ai-image-toggle"
                type="button"
                role="switch"
                aria-checked={aiGenerated}
                onClick={() => setAiGenerated((v) => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 ${
                  aiGenerated
                    ? "border-[var(--ink)] bg-[var(--ink)]"
                    : "border-slate-300 bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-[var(--plate)] shadow transition-transform duration-200 ${
                    aiGenerated ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <label
                htmlFor="ai-image-toggle"
                className="flex cursor-pointer select-none flex-col font-mono"
                onClick={() => setAiGenerated((v) => !v)}
              >
                <span className="text-xs font-bold text-[var(--ink)]">
                  {aiGenerated ? "✨ AI-generated art (Creative)" : "📷 Real photos (Unsplash)"}
                </span>
                <span className="text-[10px] text-[var(--ink-muted)] font-sans">
                  {aiGenerated
                    ? "Pollinations.ai — dynamic custom art sheets"
                    : "Unsplash — classic photography plates"}
                </span>
              </label>
            </div>

            <div className="flex flex-wrap gap-3 font-mono text-xs uppercase tracking-wider font-bold">
              <button
                type="button"
                onClick={saveArticle}
                disabled={isPersistingDraft}
                className="rounded-none bg-[var(--ink)] text-[var(--paper)] px-4 py-2 border-2 border-[var(--ink)] shadow-[2px_2px_0px_rgba(29,78,216,1)] hover:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-60"
              >
                {isPersistingDraft ? "Saving..." : "Save Manuscript"}
              </button>
              <button
                type="button"
                onClick={generate}
                disabled={loading || !topic.trim()}
                className="rounded-none border-2 border-[var(--ink)] bg-[var(--plate)] text-[var(--ink)] px-4 py-2 shadow-[2px_2px_0px_var(--ink)] hover:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-60"
              >
                Re-typeset Galley
              </button>
              <button
                type="button"
                onClick={downloadMarkdown}
                className="rounded-none border-2 border-[var(--ink)] bg-[var(--plate)] text-[var(--ink)] px-4 py-2 shadow-[2px_2px_0px_var(--ink)] hover:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                Export MD
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                className="rounded-none border-2 border-[var(--ink)] bg-[var(--plate)] text-[var(--ink)] px-4 py-2 shadow-[2px_2px_0px_var(--ink)] hover:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                Export PDF
              </button>
            </div>

            <p className="text-xs font-mono uppercase text-[var(--ink-muted)]">
              {isPersistingDraft
                ? "Writing manuscript to disk..."
                : hasUnsavedChanges
                  ? "Unsaved composition changes. Auto-logging enabled."
                  : canPersistDraft
                    ? "Manuscript composition locked and saved."
                    : "No active composition. Insert a topic above to begin."}
            </p>

            {/* Upcoming Scheduled Articles list */}
            <div className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-6 shadow-[3px_3px_0px_var(--press-dark)]" id="upcoming-jobs-container">
              <h3 className="font-serif text-lg font-extrabold text-[var(--ink)] mb-4 flex items-center justify-between border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-3">
                <span>📅 Upcoming Stagger Runs</span>
                {scheduledJobs.length > 0 && (
                  <span className="text-xs font-mono bg-[var(--ink)] text-[var(--paper)] px-2 py-0.5 font-bold">
                    {scheduledJobs.length} RUNS
                  </span>
                )}
              </h3>
              
              {scheduledJobs.length === 0 ? (
                <p className="text-xs font-mono uppercase text-[var(--ink-muted)] py-4 text-center">
                  No manuscript runs scheduled in the galley press.
                </p>
              ) : (
                <div className="divide-y divide-[color-mix(in_srgb,var(--ink)_10%,transparent)] space-y-3">
                  {scheduledJobs.map((job) => (
                    <div key={job._id} className="pt-3 first:pt-0 flex items-center justify-between gap-4 font-mono text-xs" id={`upcoming-job-${job._id}`}>
                      <div className="space-y-1">
                        <h4 className="font-serif text-sm font-extrabold text-[var(--ink)] leading-tight">
                          {job.topic}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--ink-muted)]">
                          <span className="bg-[var(--paper)] border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-2 py-0.5 font-medium">
                            RUN: {new Date(job.scheduled_at).toLocaleString()}
                          </span>
                          {job.auto_publish && (
                            <span className="bg-[var(--highlight)] border border-[#0B132B]/20 text-[#0B132B] px-2 py-0.5 font-bold">
                              🚀 AUTO-PUBLISH
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelJob(job._id)}
                        className="rounded-none bg-rose-50 hover:bg-rose-100 border-2 border-rose-350 text-rose-800 px-3 py-1.5 text-[10px] font-bold uppercase transition shadow-[1.5px_1.5px_0px_rgba(153,27,27,1)] hover:shadow-none"
                        id={`cancel-btn-${job._id}`}
                      >
                        Cancel Run
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="h-48 w-full bg-[var(--plate)] border-2 border-[color-mix(in_srgb,var(--ink)_10%,transparent)] rounded-2xl animate-pulse" />
                <div className="h-48 w-full bg-[var(--plate)] border-2 border-[color-mix(in_srgb,var(--ink)_10%,transparent)] rounded-2xl animate-pulse" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                <KeywordsPanel keywords={keywords} />
                <StructureViewer structure={structure} />
                
                <div className="xl:col-span-2">
                  <ArticleEditor blocks={blocks} setBlocks={setBlocks} keywords={keywords} />
                </div>
                
                <div className="xl:col-span-2">
                  <ImageGallery images={images} onRegenerate={generate} loading={loading} />
                </div>

                <section className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-6 shadow-[3px_3px_0px_var(--press-dark)] xl:col-span-2">
                  <h2 className="mb-4 font-serif text-lg font-extrabold text-[var(--ink)] border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-2">
                    Galley Proof HTML Layout
                  </h2>
                  {!content ? (
                    <p className="text-xs font-mono uppercase text-[var(--ink-muted)]">Generate manuscript to review inline formatting.</p>
                  ) : (
                    <article
                      className="article-html max-h-[700px] overflow-auto rounded-none border-2 border-[var(--ink)] bg-[var(--paper)] p-6 font-sans"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  )}
                </section>

                <section className="bg-[var(--plate)] border-2 border-[var(--ink)] rounded-2xl p-6 shadow-[3px_3px_0px_var(--press-dark)] xl:col-span-2">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-3">
                    <div>
                      <h2 className="font-serif text-lg font-extrabold text-[var(--ink)]">Circulation & Readership</h2>
                      <p className="text-xs text-[var(--ink-muted)] font-mono uppercase">Track proof metrics and query performance.</p>
                    </div>
                    <div className="text-right font-mono text-xs font-bold text-[var(--ink)]">
                      <p>COMPLETED GALLEYS: {publishedArticles.length}</p>
                    </div>
                  </div>

                  <div className="mb-6 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--ink-muted)]">Top Keywords:</span>
                    {analyticsFunnel.topKeywords.length > 0 ? analyticsFunnel.topKeywords.map(([kw, views]) => (
                      <span key={kw} className="inline-flex items-center gap-1.5 rounded-none border border-[var(--ink)] bg-[var(--paper)] px-2.5 py-1 font-mono text-[10px]">
                        <span className="font-bold text-[var(--ink)]">{kw}</span>
                        <span className="font-bold text-[var(--accent)] bg-[var(--plate)] border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-1.5">{views} views</span>
                      </span>
                    )) : <span className="text-[10px] font-mono text-[var(--ink-muted)]">No search metrics yet</span>}
                  </div>

                  <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
                    <div className="rounded-none border-2 border-[var(--ink)] bg-[var(--plate)] p-4">
                      <p className="text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">Manuscript Drafts</p>
                      <p className="mt-1 font-serif text-3xl font-extrabold text-[var(--ink)]">{analyticsFunnel.totalDrafts}</p>
                    </div>
                    <div className="rounded-none border-2 border-[var(--ink)] bg-[var(--plate)] p-4">
                      <p className="text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">Completed Galleys</p>
                      <p className="mt-1 font-serif text-3xl font-extrabold text-[var(--accent-deep)]">{publishedArticles.length}</p>
                    </div>
                    <div className="rounded-none border-2 border-[var(--ink)] bg-[var(--plate)] p-4">
                      <p className="text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">Galley Run Yield</p>
                      <p className="mt-1 font-serif text-3xl font-extrabold text-[var(--ink)]">{analyticsFunnel.publishedRatio}%</p>
                    </div>
                    <div className="rounded-none border-2 border-[var(--ink)] bg-[var(--plate)] p-4">
                      <p className="text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">Avg Composition Run</p>
                      <p className="mt-1 font-serif text-3xl font-extrabold text-[var(--ink)]">{analyticsFunnel.timeCount > 0 ? analyticsFunnel.avgPublishTimeText : "-"}</p>
                    </div>
                  </div>

                  {savedArticlesLoading ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="h-24 w-full bg-[var(--paper)] border-2 border-[color-mix(in_srgb,var(--ink)_10%,transparent)] animate-pulse" />
                      <div className="h-24 w-full bg-[var(--paper)] border-2 border-[color-mix(in_srgb,var(--ink)_10%,transparent)] animate-pulse" />
                    </div>
                  ) : savedArticlesFetchFailed ? (
                    <p className="text-xs font-mono uppercase text-rose-700">Metrics unavailable.</p>
                  ) : publishedArticles.length === 0 ? (
                    <p className="text-xs font-mono uppercase text-[var(--ink-muted)]">No published manuscripts in this press run.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {publishedArticles
                        .slice()
                        .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
                        .map((article) => (
                          <article key={article.id} className="rounded-none border-2 border-[var(--ink)] bg-[var(--plate)] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="font-mono">
                                <h3 className="font-serif text-sm font-extrabold text-[var(--ink)] leading-tight">{article.topic}</h3>
                                <p className="mt-1 text-[10px] text-[var(--ink-muted)]">
                                  PUBLISHED: {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "-"}
                                </p>
                                <div className="mt-3 flex items-center gap-3">
                                  <p className="text-xs font-bold text-[var(--ink)]">
                                    {(article.viewCount ?? 0).toLocaleString()} VIEWS
                                  </p>
                                  <Sparkline views={article.viewCount ?? 0} />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const confirmed = window.confirm(`Delete published article \"${article.topic}\"? This cannot be undone.`);
                                  if (!confirmed) return;
                                  void deleteArticle(article.id);
                                }}
                                className="rounded-none bg-rose-50 hover:bg-rose-100 border-2 border-rose-350 text-rose-800 px-3 py-1.5 text-[10px] font-bold uppercase transition shadow-[1.5px_1.5px_0px_rgba(153,27,27,1)] hover:shadow-none"
                              >
                                Delete
                              </button>
                            </div>

                            {article.slug ? (
                              <a
                                href={`/blog/${article.slug}`}
                                className="mt-3 inline-block text-[10px] font-bold text-[var(--accent)] underline hover:text-[var(--accent-deep)] font-mono"
                              >
                                Open Publication
                              </a>
                            ) : null}
                          </article>
                        ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </section>
        ) : (
          <section>
            <SavedArticleWorkbench
              article={savedArticles.find((article) => article.id === selectedArticleId) || null}
              onSave={updateArticle}
              onPublish={publishArticle}
              onDelete={deleteArticle}
              initialFocusMode={autoFocusOnLoad}
            />
          </section>
        )}
      </div>
    </main>
  );
}
