import ContentPageView, { contentPageMetadata } from "@/components/content/ContentPageView";

export const revalidate = false;
export const generateMetadata = () => contentPageMetadata("contact");

export default function ContactPage() {
  return <ContentPageView slug="contact" />;
}

