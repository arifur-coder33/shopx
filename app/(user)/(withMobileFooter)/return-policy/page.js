import ContentPageView, { contentPageMetadata } from "@/components/content/ContentPageView";

export const revalidate = 300;
export const generateMetadata = () => contentPageMetadata("return-policy");

export default function ReturnPolicyPage() {
  return <ContentPageView slug="return-policy" />;
}

