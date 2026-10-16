import { getSocialTrackingConfiguration } from "@/backend/serverActions/socialTrackingAction";
import { getSiteUrl } from "@/lib/siteUrl";
import SocialTrackingForm from "./SocialTrackingForm";

export const dynamic = "force-dynamic";

export default async function SocialTrackingPage() {
  const result = await getSocialTrackingConfiguration();
  if (!result.success) {
    return <div className="card p-5 text-danger">{result.message}</div>;
  }
  const siteUrl = getSiteUrl();
  const feedUrl = (path) => new URL(path, siteUrl).toString();
  const productFeedUrls = {
    google: feedUrl("/api/feed/ggl"),
    facebook: feedUrl("/api/feed/fb"),
    tiktok: feedUrl("/api/feed/tt"),
  };
  return (
    <SocialTrackingForm
      initialSettings={result.data}
      sitemapUrl={feedUrl("/sitemap.xml")}
      productFeedUrls={productFeedUrls}
    />
  );
}

