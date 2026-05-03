import { MetadataRoute } from "next";
import { getBackendUrl } from "@/lib/backend";

interface Article {
  slug: string;
  publishedAt?: string;
  createdAt: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://articleship.com";
  
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  try {
    const response = await fetch(getBackendUrl("/api/v1/articles?status=published"), {
      cache: "no-store",
    });

    if (!response.ok) {
      return staticPages;
    }

    const data = await response.json();
    const articles = (data.articles || []) as Article[];

    const articleUrls = articles.map((article) => ({
      url: `${baseUrl}/blog/${article.slug}`,
      lastModified: new Date(article.publishedAt || article.createdAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

    return [...staticPages, ...articleUrls];
  } catch (error) {
    console.error("Sitemap generation failed:", error);
    return staticPages;
  }
}
