"use client";

import { useState } from "react";
import { ContentBlock, KeywordBundle } from "@/lib/types";

type ArticleEditorProps = {
  blocks: ContentBlock[];
  setBlocks: (nextBlocks: ContentBlock[]) => void;
  keywords: KeywordBundle | null;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightKeywords(text: string, words: string[]): string {
  if (!words.length) return text;
  const validWords = words.filter((word) => word.trim().length > 1);
  if (!validWords.length) return text;
  const regex = new RegExp(`(${validWords.map((word) => escapeRegExp(word)).join("|")})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

export default function ArticleEditor({ blocks, setBlocks, keywords }: ArticleEditorProps) {
  const keywordPool = keywords
    ? [
      keywords.primary_keyword,
      ...keywords.secondary_keywords,
      ...keywords.long_tail_keywords,
      ...keywords.lsi_keywords
    ]
    : [];

  const updateBlockContent = (index: number, content: string) => {
    const next = [...blocks];
    next[index] = { ...next[index], content };
    setBlocks(next);
  };

  const [rewritingIndex, setRewritingIndex] = useState<number | null>(null);

  const handleRewrite = async (index: number, action: string) => {
    setRewritingIndex(index);
    // Simulate AI network delay for UI demonstration
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const block = blocks[index];
    let newContent = block.content;
    
    if (action === "shorten") {
      const sentences = newContent.split(". ");
      newContent = sentences.slice(0, Math.max(1, sentences.length - 2)).join(". ") + (sentences.length > 2 ? "." : "");
    } else if (action === "expand") {
      newContent = newContent + " Furthermore, this point can be expanded by considering the broader implications and offering real-world case studies that prove its effectiveness.";
    } else if (action === "simplify") {
      newContent = "(Simplified) " + newContent.replace(/[A-Z][a-z]{8,}/g, "thing");
    } else {
      newContent = "(Polished tone) " + newContent;
    }
    
    updateBlockContent(index, newContent);
    setRewritingIndex(null);
  };

  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      <h2 className="mb-4 text-xl font-semibold text-slatebrand">Article Editor</h2>
      {blocks.length === 0 ? (
        <p className="text-sm text-slate-500">No content loaded yet.</p>
      ) : (
        <div className="space-y-5">
          {blocks.map((block, index) => (
            <article key={`${block.heading}-${index}`} className="relative rounded-xl border border-slate-200 bg-white p-4">
              {rewritingIndex === index && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm">
                  <div className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xl">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    AI Rewriting...
                  </div>
                </div>
              )}
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700">{block.heading}</p>
                <div className="flex items-center gap-1.5">
                  <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Actions:</span>
                  {["Tone", "Shorten", "Expand", "Simplify"].map((action) => (
                    <button
                      key={action}
                      type="button"
                      disabled={rewritingIndex === index}
                      onClick={() => handleRewrite(index, action.toLowerCase())}
                      className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={block.content}
                onChange={(event) => updateBlockContent(index, event.target.value)}
                rows={6}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none ring-brand transition focus:ring"
              />
              <div className="article-html mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Keyword Highlight Preview</p>
                <p
                  className="content-text text-sm"
                  dangerouslySetInnerHTML={{
                    __html: highlightKeywords(block.content, keywordPool)
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
