import {
  getPublicSiteAppearance,
  getPublicSiteIdentity,
} from "@/backend/services/siteAppearanceService";

export default async function manifest() {
  const [identity, appearance] = await Promise.all([
    getPublicSiteIdentity(),
    getPublicSiteAppearance(),
  ]);
  return {
    name: identity.name,
    short_name: identity.name.slice(0, 30),
    description: identity.seoDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: appearance.lightBackground,
    theme_color: appearance.primaryColor,
    lang: "bn-BD",
    dir: "ltr",
    categories: ["shopping", "e-commerce", "retail"],
    icons: identity.logoUrl
      ? [{ src: identity.logoUrl, sizes: "512x512", type: "image/webp", purpose: "any" }]
      : [
          { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
        ],
  };
}
