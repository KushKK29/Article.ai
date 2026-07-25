"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBackendUrl } from "@/lib/backend";

type Article = {
  id: string;
  topic: string;
  slug: string;
  status: string;
  createdAt: string;
  publishedAt?: string;
  payload?: {
    meta?: {
      title?: string;
      meta_description?: string;
    };
    keywords?: {
      primary_keyword?: string;
    };
  };
};

export default function BlogPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch(getBackendUrl("/api/v1/articles"));
        if (!response.ok) {
          throw new Error("Failed to fetch articles");
        }
        const data = await response.json();
        setArticles(data.articles || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading articles");
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center">
        <p>Loading articles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-[var(--paper)] text-[var(--ink)] py-16">
      <div className="mx-auto max-w-4xl px-6">
        <h1 className="text-4xl font-serif font-bold mb-2">Galley Proofs</h1>
        <p className="text-[var(--ink-muted)] mb-12">All articles from our editorial desk</p>

        {articles.length === 0 ? (
          <p className="text-[var(--ink-muted)]">No articles yet.</p>
        ) : (
          <div className="space-y-8">
            {articles.map((article) => (
              <article
                key={article.id}
                className="border-b border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pb-8 last:border-b-0"
              >
                <div className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <Link
                      href={`/blog/${article.slug}`}
                      className="text-2xl font-serif font-bold hover:text-[var(--accent)] transition"
                    >
                      {article.payload?.meta?.title || article.topic}
                    </Link>
                    <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                      {article.status}
                    </span>
                  </div>
                  <p className="text-[var(--ink-muted)]">
                    {article.payload?.meta?.meta_description || `Read about ${article.payload?.keywords?.primary_keyword || article.topic}`}
                  </p>
                  <div className="flex items-center gap-4 text-xs font-mono text-[var(--ink-muted)]">
                    <time dateTime={article.publishedAt || article.createdAt}>
                      {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
                    </time>
                    {article.payload?.keywords?.primary_keyword && (
                      <span>{article.payload.keywords.primary_keyword}</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
