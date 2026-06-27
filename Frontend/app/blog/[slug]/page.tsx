import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getBackendUrl } from "@/lib/backend";
import ArticleViewTracker from "@/components/ArticleViewTracker";
import CitationBadgeEnhancer from "@/components/CitationBadgeEnhancer";
import PrintActions from "@/components/PrintActions";
import ManuscriptFolio from "@/components/ManuscriptFolio";

type PublishedArticle = {
  id: string;
  topic: string;
  createdAt: string;
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

function injectHeadingIds(html: string) {
  if (!html) return "";
  
  return html.replace(/<(h[234])(\b[^>]*?)>([\s\S]*?)<\/h\1>/gi, (match, tag, attrs, text) => {
    const cleanText = text.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, "");
    const id = slugifyHeading(cleanText);
    
    if (attrs.includes("id=")) {
      return match;
    }
    
    return `<${tag}${attrs} id="${id}">${text}</${tag}>`;
  });
}

function normalizePublishedArticleHtml(html: string) {
  if (!html) return "";

  const shellMatch = html.match(/^\s*<article[^>]*class="[^"]*article-shell[^"]*"[^>]*>([\s\S]*)<\/article>\s*$/i);
  const innerHtml = shellMatch?.[1] ?? html;

  // Keep a single source of truth for the title: the page header above the article HTML.
  const withoutTitle = innerHtml.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>\s*/gi, "");
  
  return injectHeadingIds(withoutTitle);
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
  const subject = topic && topic.toLowerCase() !== normalizedTitle ? topic : "modern systems";

  if (keywords.length > 0) {
    return compactText(`Archival study regarding ${keywords.join(", ")} within ${subject}.`);
  }

  return compactText(`Archival documentation regarding ${subject}.`);
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function estimateReadingMinutes(contentHtml: string) {
  const words = stripHtml(contentHtml).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function formatPublishedDate(value?: string | null) {
  if (!value) return "Manuscript Proof";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Manuscript Proof";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatCompactDate(value?: string | null) {
  if (!value) return "Manuscript Proof";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Manuscript Proof";

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
  const description = article.payload?.meta?.meta_description || buildPublishedArticleDescription(article, title) || `Read ${title} on ArticleShip.`;

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": description,
    "image": heroImage?.url || recentPostFallbackImage,
    "datePublished": article.publishedAt || article.createdAt,
    "dateModified": article.publishedAt || article.createdAt,
    "author": {
      "@type": "Person",
      "name": "Kush Goel",
      "url": "https://articleship.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "ArticleShip",
      "logo": {
        "@type": "ImageObject",
        "url": "https://articleship.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://articleship.com/blog/${slug}`
    }
  };

  return (
    <section className="scroll-smooth bg-[#F4F6F9] text-[#0B132B] min-h-screen py-16 selection:bg-[#FEF08A] selection:text-[#0B132B]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto w-full max-w-[1380px] px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
          
          {/* Left Editorial Metadata Panel */}
          <aside className="order-2 lg:order-1 hidden lg:block">
            <div className="space-y-8 lg:sticky lg:top-12 border-r border-[#0B132B]/10 pr-6">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#4B5563] space-y-4">
                <div>
                  <span className="block font-bold text-[#0B132B]">Publisher</span>
                  <span className="block mt-1">ArticleShip House</span>
                </div>
                <div>
                  <span className="block font-bold text-[#0B132B]">Series</span>
                  <span className="block mt-1">{article.payload?.keywords?.primary_keyword || "Technical Dispatch"}</span>
                </div>
                <div>
                  <span className="block font-bold text-[#0B132B]">Composition</span>
                  <span className="block mt-1">Stagger Run Engine</span>
                </div>
                <div>
                  <span className="block font-bold text-[#0B132B]">Format</span>
                  <span className="block mt-1">Typeset Galley Proof</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Central Main Article Thread */}
          <main className="order-1 w-full lg:order-2">
            <article className="mx-auto w-full max-w-[65ch]">
              <ArticleViewTracker articleId={article.id} />
              <CitationBadgeEnhancer />

              {/* Byline and Category Flag */}
              <div className="mb-6 font-mono text-[10px] uppercase tracking-widest">
                <span className="bg-[#FEF08A] text-[#0B132B] border border-[#0B132B]/20 px-2 py-0.5 font-bold">
                  {article.payload?.keywords?.primary_keyword || "Editorial"}
                </span>
                <span className="ml-3 text-[#4B5563]">Composition Dispatch</span>
              </div>

              {/* Headline */}
              <h1 className="mb-6 text-balance font-serif text-3xl md:text-4xl font-extrabold leading-tight text-[#0B132B] tracking-tight">
                {title}
              </h1>

              {/* Deck / Abstract */}
              {description ? (
                <p className="mb-8 font-serif text-lg leading-relaxed text-[#4B5563] italic border-l-2 border-[#0B132B]/20 pl-4">
                  {description}
                </p>
              ) : null}

              {/* Author & Chronology Block */}
              <div className="flex flex-wrap items-center gap-2 border-b border-[#0B132B]/10 pb-4 mb-8 font-mono text-[10px] uppercase tracking-widest text-[#4B5563]">
                <span className="font-bold text-[#0B132B]">By Kush Goel</span>
                <span>·</span>
                <time>{publishedDate}</time>
                <span>·</span>
                <span>{readingTime} min read</span>
              </div>

              {/* Print Action Controller */}
              <PrintActions />

              {/* Mobile Manuscript Folio */}
              <div className="block lg:hidden mb-8 border-2 border-[#0B132B] p-4 bg-white shadow-[2px_2px_0px_rgba(11,19,43,1)]">
                <h3 className="border-b border-[#0B132B]/10 pb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[#0B132B] mb-4">
                  Folio Index
                </h3>
                <ManuscriptFolio items={tableOfContents} />
              </div>

              {/* Hero Plate Illustration */}
              {shouldRenderHeroImage && heroImage?.url ? (
                <div className="mb-10 overflow-hidden rounded-2xl border-2 border-[#0B132B]/10 bg-[#0B132B]/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImage.url}
                    alt={heroImage.alt || title}
                    className="w-full object-cover max-h-[400px] filter grayscale hover:grayscale-0 transition duration-300"
                    loading="lazy"
                  />
                  {heroImage.caption && (
                    <div className="p-3 bg-white border-t border-[#0B132B]/10 font-mono text-[10px] text-[#4B5563] uppercase tracking-wider text-center">
                      Plate: {heroImage.caption}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Typographic Core Body Content */}
              <div 
                className="article-html font-sans text-base leading-relaxed text-[#0B132B] space-y-6 prose prose-stone prose-md max-w-none" 
                dangerouslySetInnerHTML={{ __html: content }} 
              />

              {tags.length > 0 ? (
                <div className="mt-12 flex flex-wrap gap-2 border-t border-[#0B132B]/10 pt-8 font-mono text-[10px] uppercase tracking-widest">
                  <span className="mr-2 self-center font-bold text-[#0B132B]">Indices:</span>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-[#0B132B]/20 bg-white px-2 py-1 text-[#4B5563]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          </main>

          {/* Right Literary Index Column (Table of Contents) */}
          <aside className="order-3 w-full lg:block hidden">
            <div className="space-y-8 lg:sticky lg:top-12 border-l border-[#0B132B]/10 pl-6">
              <div className="space-y-3">
                <h3 className="border-b border-[#0B132B]/10 pb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[#0B132B]">
                  Folio Index
                </h3>
                <ManuscriptFolio items={tableOfContents} />
              </div>
            </div>
          </aside>
        </div>

        {/* Recently Published Section */}
        {recentArticles.length > 0 ? (
          <section className="mt-20 border-t-2 border-[#0B132B] pt-12">
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="font-serif text-2xl font-extrabold text-[#0B132B]">Recent Technical Dispatches</h2>
              <Link href="/articles" className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1E3A8A] hover:underline">
                All Archives →
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {recentArticles.slice(0, 3).map((recentArticle) => {
                const recentTitle =
                  recentArticle.payload?.structure?.h1 || recentArticle.payload?.meta?.title || recentArticle.topic;
                const recentContent = normalizePublishedArticleHtml(recentArticle.payload?.content || "");
                const recentSummary =
                  recentArticle.payload?.meta?.meta_description || stripHtml(recentContent).slice(0, 140).trim() || "Read the complete technical dispatch.";
                const recentCategory = compactText(recentArticle.payload?.keywords?.primary_keyword || "Technical") || "Technical";
                const recentReadMinutes = estimateReadingMinutes(recentContent);

                return (
                  <Link
                    key={recentArticle.id}
                    href={`/blog/${recentArticle.slug}`}
                    className="group block bg-white border-2 border-[#0B132B] rounded-2xl p-6 shadow-[3px_3px_0px_rgba(11,19,43,0.05)] hover:shadow-[3px_3px_0px_rgba(29,78,216,1)] transition-all font-serif"
                  >
                    <span className="mb-2 block font-mono text-[9px] font-bold uppercase tracking-widest text-[#1D4ED8]">
                      {recentCategory}
                    </span>
                    
                    <h3 className="text-lg font-extrabold leading-tight text-[#0B132B] group-hover:underline">
                      {recentTitle}
                    </h3>
                    
                    <p className="mt-3 text-xs leading-relaxed text-[#4B5563] line-clamp-3">
                      {recentSummary}
                    </p>
                    
                    <p className="mt-4 font-mono text-[9px] uppercase tracking-wider text-[#4B5563]/60">
                      {formatCompactDate(recentArticle.publishedAt)} · {recentReadMinutes} min read
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
