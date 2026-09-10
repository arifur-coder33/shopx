import ContentPageView, { contentPageMetadata } from "@/components/content/ContentPageView";

export const revalidate = 300;
export const generateMetadata = () => contentPageMetadata("privacy");

export default function PrivacyPage() {
  return <ContentPageView slug="privacy" />;
}

