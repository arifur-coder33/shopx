import { getSiteUrl } from "@/lib/siteUrl";

export default async function robots() {
  const siteUrl = await getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/my-account/",
          "/checkout",
          "/buynow/",
          "/payment/",
          "/order-success",
          "/tracking",
          "/wishlist",
          "/search",
          "/login",
          "/register",
          "/forgot-password",
          "/unauthorized",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
