import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getBackendUrl } from "@/lib/backend";

type PublishedArticle = {
  id: string;
  topic: string;
  slug?: string;
  status?: string;
  publishedAt?: string | null;
  payload?: {
    keywords?: {
      primary_keyword?: string;
      secondary_keywords?: string[];
      long_tail_keywords?: string[];
      lsi_keywords?: string[];
      search_intent?: string;
    };
    content?: string;
    images?: Array<{
      heading?: string;
      url?: string;
      alt?: string;
      caption?: string;
    }>;
    meta?: {
      meta_description?: string;
      title?: string;
    };
    structure?: {
      h1?: string;
      sections?: Array<{
        h2: string;
        subsections: Array<{
          h3: string;
          h4_tags: string[];
        }>;
      }>;
    };
  };
};

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function slugifyHeading(value: string) {
  return compactText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type TableOfContentsItem = {
  label: string;
  href: string;
  level: 2 | 3 | 4;
};

function buildTableOfContents(article: PublishedArticle) {
  const toc: TableOfContentsItem[] = [];
  const structure = article.payload?.structure;

  if (structure?.h1) {
    toc.push({ label: structure.h1, href: `#${slugifyHeading(structure.h1)}`, level: 2 });
  }

  for (const section of structure?.sections ?? []) {
    toc.push({ label: section.h2, href: `#${slugifyHeading(section.h2)}`, level: 2 });

    for (const subsection of section.subsections ?? []) {
      toc.push({ label: subsection.h3, href: `#${slugifyHeading(subsection.h3)}`, level: 3 });

      for (const tag of subsection.h4_tags ?? []) {
        toc.push({ label: tag, href: `#${slugifyHeading(tag)}`, level: 4 });
      }
    }
  }

  return toc;
}

function normalizePublishedArticleHtml(html: string) {
  if (!html) return "";

  const shellMatch = html.match(/^\s*<article[^>]*class="[^"]*article-shell[^"]*"[^>]*>([\s\S]*)<\/article>\s*$/i);
  const innerHtml = shellMatch?.[1] ?? html;

  // Keep a single source of truth for the title: the page header above the article HTML.
  return innerHtml.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>\s*/gi, "");
}

function buildPublishedArticleDescription(article: PublishedArticle, title: string) {
  const keywordPool = [
    article.payload?.keywords?.primary_keyword,
    ...(article.payload?.keywords?.secondary_keywords ?? []),
    ...(article.payload?.keywords?.long_tail_keywords ?? []),
    ...(article.payload?.keywords?.lsi_keywords ?? [])
  ]
    .map((keyword) => compactText(keyword || ""))
    .filter(Boolean);

  const keywords = Array.from(new Set(keywordPool)).slice(0, 3);
  const normalizedTitle = compactText(title).toLowerCase();
  const topic = compactText(article.topic || "");
  const subject = topic && topic.toLowerCase() !== normalizedTitle ? topic : "modern software teams";

  if (keywords.length > 0) {
    return compactText(`Practical insights on ${keywords.join(", ")} for ${subject}.`);
  }

  return compactText(`Practical guidance on AI-assisted software engineering workflows for ${subject}.`);
}

async function getArticle(slug: string): Promise<PublishedArticle | null> {
  const response = await fetch(getBackendUrl(`/api/v1/articles?slug=${encodeURIComponent(slug)}`), {
    cache: "no-store"
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.article ?? null;
}

async function getRecentArticles(currentSlug: string) {
  const response = await fetch(getBackendUrl("/api/v1/articles?status=published"), {
    cache: "no-store"
  });

  if (!response.ok) return [] as PublishedArticle[];

  const data = await response.json();
  const articles = (data.articles ?? []) as PublishedArticle[];

  return articles
    .filter((item) => item.slug && item.slug !== currentSlug)
    .sort((left, right) => {
      const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
      const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 5);
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = params;
  const article = await getArticle(slug);

  if (!article) {
    return { title: "Article not found" };
  }

  const title = article.payload?.structure?.h1 || article.payload?.meta?.title || article.topic;
  const description = buildPublishedArticleDescription(article, title) || article.payload?.meta?.meta_description || `Read ${title} on ArticleShip.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article"
    }
  };
}

export default async function BlogArticlePage({
  params
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  const title = article.payload?.structure?.h1 || article.payload?.meta?.title || article.topic;
  const description = buildPublishedArticleDescription(article, title) || article.payload?.meta?.meta_description || `Read ${title} on ArticleShip.`;
  const content = normalizePublishedArticleHtml(article.payload?.content || "");
  const recentArticles = await getRecentArticles(slug);
  const tableOfContents = buildTableOfContents(article);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-10 md:px-8 scroll-smooth">
      <div className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)] md:items-start">
        <aside className="glass-card rounded-3xl p-5 md:sticky md:top-8 md:max-h-[calc(100vh-4rem)] md:overflow-y-auto">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Structure</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Jump to section</h2>
          </div>

          <nav className="space-y-1 text-sm">
            {tableOfContents.length > 0 ? (
              tableOfContents.map((item) => (
                <a
                  key={`${item.level}-${item.href}-${item.label}`}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2 leading-6 text-slate-700 transition hover:bg-sky-50 hover:text-sky-800 ${
                    item.level === 3 ? "pl-6 text-[13px]" : item.level === 4 ? "pl-9 text-[12px] text-slate-500" : "font-medium"
                  }`}
                >
                  {item.label}
                </a>
              ))
            ) : (
              <p className="text-sm text-slate-500">No structure available for this article.</p>
            )}
          </nav>
        </aside>

        <div className="space-y-6">
          <article className="glass-card rounded-3xl p-6 md:p-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">
              Published Article
            </p>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              {title}
            </h1>
            {description ? <p className="mb-8 max-w-3xl text-base text-slate-600">{description}</p> : null}

            <div className="article-html mt-8" dangerouslySetInnerHTML={{ __html: content }} />

            {article.publishedAt ? (
              <p className="mt-6 text-xs text-slate-500">
                Published {new Date(article.publishedAt).toLocaleString()}
              </p>
            ) : null}
          </article>

          {recentArticles.length > 0 ? (
            <section className="glass-card rounded-3xl p-6 md:p-8">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">
                    Recent Articles
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                    Recently published stories
                  </h2>
                </div>
                <p className="text-sm text-slate-500">More live articles to explore</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {recentArticles.map((recentArticle) => {
                  const recentTitle =
                    recentArticle.payload?.structure?.h1 || recentArticle.payload?.meta?.title || recentArticle.topic;
                  const summary =
                    buildPublishedArticleDescription(recentArticle, recentTitle) ||
                    recentArticle.payload?.meta?.meta_description ||
                    `Read ${recentTitle} on ArticleShip.`;

                  return (
                    <Link
                      key={recentArticle.id}
                      href={`/blog/${recentArticle.slug}`}
                      className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-card"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                        {recentArticle.publishedAt ? new Date(recentArticle.publishedAt).toLocaleDateString() : "Published"}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900 transition group-hover:text-sky-700">
                        {recentTitle}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{summary}</p>
                      <span className="mt-4 inline-flex text-sm font-semibold text-sky-700 underline underline-offset-4">
                        Read article
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
