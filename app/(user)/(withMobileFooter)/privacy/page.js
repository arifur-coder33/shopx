import ContentPageView, { contentPageMetadata } from "@/components/content/ContentPageView";

export const revalidate = false;
export const generateMetadata = () => contentPageMetadata("privacy");

export default function PrivacyPage() {
  return <ContentPageView slug="privacy" />;
}

