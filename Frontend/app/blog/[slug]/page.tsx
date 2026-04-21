import { notFound } from "next/navigation";
import type { Metadata } from "next";
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
    };
  };
};

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10 md:px-8">
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
    </main>
  );
}
