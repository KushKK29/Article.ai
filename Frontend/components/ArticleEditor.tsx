"use client";

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

  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      <h2 className="mb-4 text-xl font-semibold text-slatebrand">Article Editor</h2>
      {blocks.length === 0 ? (
        <p className="text-sm text-slate-500">No content loaded yet.</p>
      ) : (
        <div className="space-y-5">
          {blocks.map((block, index) => (
            <article key={`${block.heading}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">{block.heading}</p>
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
