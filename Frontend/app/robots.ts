import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/articles", "/api/"],
    },
    sitemap: "https://articleship.com/sitemap.xml",
  };
}
