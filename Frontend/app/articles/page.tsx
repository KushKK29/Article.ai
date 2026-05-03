"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SavedArticleRecord } from "@/components/SavedArticleWorkbench";

const ITEMS_PER_PAGE = 12;

export default function ArticlesPage() {
  const [articles, setArticles] = useState<SavedArticleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "views_desc">("date_desc");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadArticles() {
      try {
        const res = await fetch("/api/articles");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setArticles(data.articles || []);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    loadArticles();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    articles.forEach(a => {
      if (a.category) cats.add(a.category);
    });
    return Array.from(cats).sort();
  }, [articles]);

  const filteredAndSorted = useMemo(() => {
    let result = articles;

    // Filter by search query
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(a => 
        (a.topic && a.topic.toLowerCase().includes(lowerQ)) || 
        (a.slug && a.slug.toLowerCase().includes(lowerQ))
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter(a => a.status === statusFilter);
    }

    // Filter by category
    if (categoryFilter !== "all") {
      result = result.filter(a => a.category === categoryFilter);
    }

    // Sort
    result = result.sort((a, b) => {
      if (sortBy === "views_desc") {
        return (b.viewCount || 0) - (a.viewCount || 0);
      }
      
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : new Date(b.createdAt).getTime();
      
      if (sortBy === "date_desc") return dateB - dateA;
      if (sortBy === "date_asc") return dateA - dateB;
      return 0;
    });

    return result;
  }, [articles, searchQuery, statusFilter, categoryFilter, sortBy]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE) || 1;
  
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedArticles = filteredAndSorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 lg:px-12 bg-[var(--surface-soft)] text-[var(--text-main)]">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-main)]">All Articles</h1>
            <p className="text-[var(--text-muted)] mt-1">Manage and view all your generated content.</p>
          </div>
          <Link href="/generate" className="inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">
            Back to Studio
          </Link>
        </header>

        <section className="glass-card rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 w-full md:max-w-md">
              <input 
                type="text" 
                placeholder="Search by topic or slug..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 bg-[var(--surface-soft)] text-[var(--text-main)]"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value as any)}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-emerald-500/50 bg-[var(--surface-soft)]"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>

              <select 
                value={categoryFilter} 
                onChange={e => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-emerald-500/50 bg-[var(--surface-soft)]"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value as any)}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-emerald-500/50 bg-[var(--surface-soft)]"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="views_desc">Most Views</option>
              </select>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
               <div key={i} className="skeleton h-48 w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-500">
            Failed to load articles. Please refresh the page.
          </div>
        ) : paginatedArticles.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--text-muted)]">
            No articles found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedArticles.map(article => (
              <div key={article.id} className="flex flex-col justify-between rounded-2xl p-5 border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:shadow-md">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${article.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {article.status || "draft"}
                    </span>
                    {article.category && (
                      <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 ml-2">
                        {article.category}
                      </span>
                    )}
                    {article.status === "published" && (
                      <span className="text-xs font-semibold text-[var(--text-muted)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded-full">
                        {article.viewCount || 0} views
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-main)] line-clamp-2 leading-tight">
                    {article.topic}
                  </h3>
                  <div className="mt-4 text-xs text-[var(--text-muted)] space-y-1.5">
                     <p><span className="font-semibold text-[var(--text-main)]">Created:</span> {new Date(article.createdAt).toLocaleDateString()}</p>
                     {article.publishedAt && <p><span className="font-semibold text-[var(--text-main)]">Published:</span> {new Date(article.publishedAt).toLocaleDateString()}</p>}
                     {article.slug && <p className="truncate"><span className="font-semibold text-[var(--text-main)]">Slug:</span> /{article.slug}</p>}
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                  <Link href={`/generate?articleId=${article.id}`} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition">
                    Edit Article
                  </Link>
                  {article.status === "published" && article.slug && (
                    <a href={`/blog/${article.slug}`} className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition" target="_blank" rel="noreferrer">
                      View Live →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filteredAndSorted.length > 0 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-6">
            <p className="text-sm text-[var(--text-muted)]">
              Showing <span className="font-semibold text-[var(--text-main)]">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredAndSorted.length)}</span> to <span className="font-semibold text-[var(--text-main)]">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)}</span> of <span className="font-semibold text-[var(--text-main)]">{filteredAndSorted.length}</span> articles
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text-main)] transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text-main)] transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
