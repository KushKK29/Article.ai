"use client";

import { KeywordBundle } from "@/lib/types";

type KeywordsPanelProps = {
  keywords: KeywordBundle | null;
};

function renderKeywordGroup(label: string, values: string[]) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-700">{label}</h4>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={`${label}-${value}`}
            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function KeywordsPanel({ keywords }: KeywordsPanelProps) {
  const handleCopy = async () => {
    if (!keywords) return;
    const text = [
      `Primary: ${keywords.primary_keyword}`,
      `Secondary: ${keywords.secondary_keywords.join(", ")}`,
      `Long-tail: ${keywords.long_tail_keywords.join(", ")}`,
      `LSI: ${keywords.lsi_keywords.join(", ")}`
    ].join("\n");
    await navigator.clipboard.writeText(text);
  };

  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slatebrand">Keywords</h2>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!keywords}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
        >
          Copy
        </button>
      </div>

      {!keywords ? (
        <p className="text-sm text-slate-500">Generate an article to load keyword intelligence.</p>
      ) : (
        <div className="space-y-4">
          {renderKeywordGroup("Primary Keyword", [keywords.primary_keyword])}
          {renderKeywordGroup("Secondary Keywords", keywords.secondary_keywords)}
          {renderKeywordGroup("Long-tail Keywords", keywords.long_tail_keywords)}
          {renderKeywordGroup("LSI Keywords", keywords.lsi_keywords)}
        </div>
      )}
    </section>
  );
}
