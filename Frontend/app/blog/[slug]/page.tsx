import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getBackendUrl } from "@/lib/backend";
import ArticleViewTracker from "@/components/ArticleViewTracker";

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

function AdsenseSlot({
  title,
  tone = "standard",
  className = ""
}: {
  title: string;
  tone?: "best" | "strong" | "standard";
  className?: string;
}) {
  const toneClass: Record<"best" | "strong" | "standard", string> = {
    best: "border-rose-200 bg-rose-50 text-rose-900",
    strong: "border-amber-200 bg-amber-50 text-amber-900",
    standard: "border-stone-200 bg-stone-50 text-stone-700"
  };

  return (
    <aside
      className={`rounded-xl border-2 border-dashed p-4 ${toneClass[tone]} ${className}`}
      aria-label={title}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em]">Google AdSense</p>
      <p className="mt-2 text-sm font-semibold leading-snug">{title}</p>
    </aside>
  );
}

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

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function estimateReadingMinutes(contentHtml: string) {
  const words = stripHtml(contentHtml).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function formatPublishedDate(value?: string | null) {
  if (!value) return "Unpublished";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unpublished";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatCompactDate(value?: string | null) {
  if (!value) return "Unpublished";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unpublished";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function normalizeImageSignature(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    return `${parsed.origin}${parsed.pathname}`.toLowerCase();
  } catch {
    return raw.split("?")[0].toLowerCase();
  }
}

function extractImageSourcesFromHtml(html: string) {
  const sources: string[] = [];
  const regex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    if (match[1]) {
      sources.push(match[1]);
    }
  }

  return sources;
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
  const readingTime = estimateReadingMinutes(content);
  const publishedDate = formatPublishedDate(article.publishedAt);
  const heroImage = article.payload?.images?.find((item) => !!item?.url) || null;
  const heroSignature = normalizeImageSignature(heroImage?.url || "");
  const contentImageSignatures = new Set(
    extractImageSourcesFromHtml(content).map((item) => normalizeImageSignature(item))
  );
  const contentStartsWithImage = /^\s*(?:<figure[^>]*>\s*)?<img\b/i.test(content);
  const shouldRenderHeroImage = Boolean(
    heroImage?.url && !contentStartsWithImage && !contentImageSignatures.has(heroSignature)
  );
  const tags = [
    article.payload?.keywords?.primary_keyword,
    ...(article.payload?.keywords?.secondary_keywords ?? []).slice(0, 3)
  ]
    .map((item) => compactText(item || ""))
    .filter(Boolean);

  const recentPostFallbackImage = "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=900&h=500&fit=crop";

  const adContext = compactText(article.payload?.keywords?.primary_keyword || title || "Article Insights");

  return (
    <section className="scroll-smooth pt-8 pb-3 md:pt-12 md:pb-5">
      <div className="mx-auto w-full max-w-[1380px] px-3">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[300px_minmax(0,1fr)_280px] lg:gap-10 xl:gap-12">
          <aside className="order-2 hidden w-full lg:order-1 lg:block">
            <div className="space-y-6 lg:sticky lg:top-8">
              <AdsenseSlot
                title={`Left Ad 1 - ${adContext}`}
                tone="best"
                className="min-h-[280px]"
              />
              <AdsenseSlot
                title={`Left Ad 2 - ${adContext}`}
                tone="strong"
                className="min-h-[280px]"
              />
              <AdsenseSlot
                title={`Left Ad 3 - ${adContext}`}
                className="min-h-[280px]"
              />
            </div>
          </aside>

          <main className="order-1 w-full lg:order-2">
            <article className="mx-auto mb-16 w-full max-w-3xl">
              <ArticleViewTracker articleId={article.id} />

              <AdsenseSlot
                title="Ad Slot 1 - Header / Top Content"
                tone="best"
                className="mb-8"
              />

              <div className="mb-6">
                <span className="mb-4 inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal-700">
                  Featured
                </span>
                <h1 className="mb-3 text-balance text-3xl font-bold leading-tight text-stone-900 md:text-4xl">
                  {title}
                </h1>
                {description ? (
                  <p className="mb-4 text-base leading-relaxed text-stone-500">{description}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-sm text-stone-400">
                  <span className="font-medium text-stone-600">By ArticleShip Editorial</span>
                  <span>·</span>
                  <time>{publishedDate}</time>
                  <span>·</span>
                  <span>{readingTime} min read</span>
                </div>
              </div>

              {shouldRenderHeroImage && heroImage?.url ? (
                <div className="mb-8 overflow-hidden rounded-xl border border-stone-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImage.url}
                    alt={heroImage.alt || title}
                    className="h-64 w-full object-cover md:h-80"
                    loading="lazy"
                  />
                </div>
              ) : null}

              <div className="article-html prose-custom space-y-5 text-base leading-relaxed text-stone-700" dangerouslySetInnerHTML={{ __html: content }} />

              <AdsenseSlot
                title="Ad Slot 2 - In-content"
                tone="strong"
                className="mt-10 hidden lg:block"
              />

              {tags.length > 0 ? (
                <div className="mt-10 flex flex-wrap gap-2 border-t border-stone-200 pt-8">
                  <span className="mr-2 self-center text-xs font-semibold uppercase tracking-wider text-stone-400">Tags:</span>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          </main>

          <aside className="order-3 w-full lg:pl-3 xl:pl-4">
            <div className="space-y-10 lg:sticky lg:top-8">
              <div>
                <h3 className="border-b border-stone-200 pb-1 text-xs font-bold uppercase tracking-widest text-stone-400">
                  Jump to section
                </h3>
                <nav className="space-y-1">
                  {tableOfContents.length > 0 ? (
                    tableOfContents
                      .filter((item) => item.level === 2)
                      .map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          className="block border-l-2 border-transparent py-1 pl-3 text-sm text-stone-500 transition-colors hover:border-teal-600 hover:text-teal-700"
                        >
                          {item.label}
                        </a>
                      ))
                  ) : (
                    <p className="text-sm text-stone-500">No sections available.</p>
                  )}
                </nav>
              </div>

              <AdsenseSlot
                title={`Right Ad - ${adContext}`}
                tone="strong"
                className="min-h-[250px]"
              />

              {/*
              <div className="rounded-xl border border-stone-200 bg-white p-6">
                <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-stone-400">Categories</h3>
                <div className="space-y-2">
                  {[
                    { label: "AI & Machine Learning", count: 12 },
                    { label: "No-Code / Low-Code", count: 8 },
                    { label: "Software Architecture", count: 15 },
                    { label: "Developer Tools", count: 10 },
                    { label: "Career & Growth", count: 6 },
                    { label: "Honest Reviews", count: 9 }
                  ].map((category) => (
                    <span
                      key={category.label}
                      className="flex items-center justify-between border-b border-stone-100 py-2 text-sm text-stone-600 last:border-0"
                    >
                      <span>{category.label}</span>
                      <span className="rounded-full bg-stone-50 px-2 py-0.5 text-xs text-stone-400">{category.count}</span>
                    </span>
                  ))}
                </div>
              </div>
              */}

              {/*
              <div className="rounded-xl border border-teal-100 bg-teal-50 p-6">
                <h3 className="mb-2 text-sm font-bold text-stone-900">Stay in the loop</h3>
                <p className="mb-4 text-sm leading-relaxed text-stone-500">
                  Honest dev insights, no fluff. Delivered when there&apos;s something worth reading.
                </p>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="mb-3 w-full rounded-lg border border-teal-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
                <button className="w-full rounded-lg bg-teal-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800">
                  Subscribe
                </button>
              </div>
              */}

            </div>
          </aside>
        </div>

        {recentArticles.length > 0 ? (
          <>
            <section className="mt-16 border-t border-stone-200 pt-12 md:pt-14">
              <div className="mb-8 flex items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight text-stone-900">Recently published</h2>
                <span className="text-sm font-semibold text-teal-700">View all articles →</span>
              </div>

              <div className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
                {recentArticles.slice(0, 3).map((recentArticle) => {
                  const recentTitle =
                    recentArticle.payload?.structure?.h1 || recentArticle.payload?.meta?.title || recentArticle.topic;
                  const recentContent = normalizePublishedArticleHtml(recentArticle.payload?.content || "");
                  const recentSummary =
                    recentArticle.payload?.meta?.meta_description || stripHtml(recentContent).slice(0, 140).trim() || "Read the full article for practical insights.";
                  const recentCategory = compactText(recentArticle.payload?.keywords?.primary_keyword || "AI Development") || "AI Development";
                  const recentImage = recentPostFallbackImage;
                  const recentReadMinutes = estimateReadingMinutes(recentContent);

                  return (
                    <Link
                      key={recentArticle.id}
                      href={`/blog/${recentArticle.slug}`}
                      className="group block"
                    >
                      <div className="mb-4 overflow-hidden rounded-xl border border-stone-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={recentImage}
                          alt={recentTitle}
                          className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                      </div>

                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{recentCategory}</p>
                      <h3 className="text-2xl font-bold leading-tight text-stone-900 transition-colors group-hover:text-teal-800">
                        {recentTitle}
                      </h3>
                      <p className="mt-3 text-base leading-relaxed text-stone-500">{recentSummary}</p>
                      <p className="mt-4 text-sm text-stone-400">
                        {formatCompactDate(recentArticle.publishedAt)} · {recentReadMinutes} min read
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>

            <div className="mx-auto mt-4 w-full max-w-4xl">
              <AdsenseSlot
                title="Ad Slot 5 - After Recently Published"
                tone="strong"
                className="min-h-[72px]"
              />
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
