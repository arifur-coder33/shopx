import ContentPageView, { contentPageMetadata } from "@/components/content/ContentPageView";

export const generateMetadata = () => contentPageMetadata("terms-of-service");

export default function TermsOfServicePage() {
  return <ContentPageView slug="terms-of-service" />;
}
