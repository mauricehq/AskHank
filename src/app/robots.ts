import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/conversations", "/admin", "/settings", "/stats", "/card/", "/render/"],
    },
    sitemap: "https://askhank.app/sitemap.xml",
  };
}
