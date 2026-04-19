"use client";

import { useEffect, useMemo, useState } from "react";
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

const STEPS = ["Generating keywords", "Building structure", "Writing article", "Generating images"];

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
          success: "border-emerald-200 bg-emerald-50 text-emerald-800",
          error: "border-red-200 bg-red-50 text-red-800",
          info: "border-sky-200 bg-sky-50 text-sky-800"
        };
        return (
          <div
            key={toast.id}
            className={`rounded-lg border px-3 py-2 text-sm shadow-card ${tone[toast.type]}`}
            role="status"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{toast.title}</p>
                {toast.description ? <p className="text-xs opacity-90">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
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
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

  const fetchSavedArticles = async () => {
    try {
      const response = await fetch("/api/save-article", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setSavedArticles(data.articles ?? []);
      setSelectedArticleId((currentSelected) => {
        if (!currentSelected) return data.articles?.[0]?.id ?? null;
        return data.articles?.some((article: SavedArticle) => article.id === currentSelected)
          ? currentSelected
          : data.articles?.[0]?.id ?? null;
      });
    } catch {
      addToast("error", "Could not load saved articles");
    }
  };

  useEffect(() => {
    void fetchSavedArticles();
  }, []);

  const generate = async () => {
    if (!topic.trim()) {
      addToast("error", "Topic is required", "Enter a topic before generating");
      return;
    }

    setLoading(true);
    setCurrentStep(0);

    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic })
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(errorPayload.error || "Generation failed");
      }

      const data: GenerateApiResponse = await response.json();
      setKeywords(data.keywords);
      setStructure(data.structure);
      setMeta(data.meta ?? null);
      setContent(data.content);
      setImages(data.images);
      setBlocks(data.blocks || []);
      setCurrentStep(STEPS.length);
      addToast("success", "Article generated", "Your SEO content package is ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      addToast("error", "Generation failed", message);
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const saveArticle = async () => {
    if (!topic || blocks.length === 0) {
      addToast("error", "Nothing to save", "Generate and edit article first");
      return;
    }

    try {
      const response = await fetch("/api/save-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          payload: {
            meta,
            keywords,
            structure,
            content,
            blocks,
            images
          }
        })
      });

      if (!response.ok) {
        throw new Error("Save API failed");
      }
      addToast("success", "Draft saved", "Stored in backend MongoDB as a draft");
      await fetchSavedArticles();
    } catch {
      addToast("error", "Could not save article");
    }
  };

  const publishArticle = async (articleId: string) => {
    try {
      const response = await fetch(`/api/articles/${articleId}/publish`, {
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
      const response = await fetch(`/api/articles/${articleId}`, {
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
      const response = await fetch(`/api/articles/${articleId}`, {
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
    <main className="min-h-screen px-4 py-6 md:px-8 lg:px-12">
      <ToastBar toasts={toasts} removeToast={removeToast} />

      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-6 lg:grid-cols-[230px_1fr]">
        <div className="space-y-6">
          <aside className="glass-card h-fit rounded-2xl p-4">
            <h1 className="mb-4 text-xl font-bold tracking-tight text-slatebrand">ArticleShip</h1>
            <nav className="space-y-2 text-sm">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`w-full rounded-lg px-3 py-2 text-left font-semibold transition ${
                  activeTab === "dashboard"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("articles")}
                className={`w-full rounded-lg px-3 py-2 text-left font-semibold transition ${
                  activeTab === "articles"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                My Articles
              </button>
            </nav>
          </aside>

          {activeTab === "articles" ? (
            <aside className="glass-card rounded-2xl p-6 xl:max-h-[calc(100vh-220px)] xl:overflow-hidden">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slatebrand">My Articles</h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedArticleId(null);
                    setTopic("");
                    setKeywords(null);
                    setStructure(null);
                    setMeta(null);
                    setContent("");
                    setImages([]);
                    setBlocks([]);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  New Draft
                </button>
              </div>

              {savedArticles.length === 0 ? (
                <p className="text-sm text-slate-500">No saved articles yet.</p>
              ) : (
                <ul className="space-y-3 xl:max-h-[calc(100vh-320px)] xl:overflow-y-auto xl:pr-1">
                  {savedArticles.map((article) => {
                    const isSelected = article.id === selectedArticleId;
                    return (
                      <li
                        key={article.id}
                        className={`rounded-xl border bg-white p-3 transition ${
                          isSelected ? "border-sky-300 ring-2 ring-sky-100" : "border-slate-200"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedArticleId(article.id)}
                          className="w-full text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-800">{article.topic}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                                article.status === "published"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {article.status || "draft"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{new Date(article.createdAt).toLocaleString()}</p>
                          {article.slug ? (
                            <a
                              href={`/blog/${article.slug}`}
                              className="mt-1 inline-block text-xs font-semibold text-sky-700 underline underline-offset-2"
                              onClick={(event) => event.stopPropagation()}
                            >
                              View live
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

        {activeTab === "dashboard" ? (
          <section className="space-y-6">
            <TopicInput
              topic={topic}
              setTopic={setTopic}
              onGenerate={generate}
              loading={loading}
              currentStep={displaySteps}
              steps={STEPS}
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveArticle}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Save Article
              </button>
              <button
                type="button"
                onClick={generate}
                disabled={loading || !topic.trim()}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={downloadMarkdown}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Download as Markdown
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Download as PDF
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <KeywordsPanel keywords={keywords} />
                <StructureViewer structure={structure} />
                <div className="xl:col-span-2">
                  <ArticleEditor blocks={blocks} setBlocks={setBlocks} keywords={keywords} />
                </div>
                <div className="xl:col-span-2">
                  <ImageGallery images={images} onRegenerate={generate} loading={loading} />
                </div>
                <section className="glass-card rounded-2xl p-5 md:p-6 xl:col-span-2">
                  <h2 className="mb-4 text-xl font-semibold text-slatebrand">Hybrid HTML Preview</h2>
                  {!content ? (
                    <p className="text-sm text-slate-500">Generate content to view the rendered hybrid HTML.</p>
                  ) : (
                    <article
                      className="article-html max-h-[700px] overflow-auto rounded-xl border border-slate-200 bg-white p-4"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
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
            />
          </section>
        )}
      </div>
    </main>
  );
}
