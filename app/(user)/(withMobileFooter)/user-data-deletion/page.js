import ContentPageView, { contentPageMetadata } from "@/components/content/ContentPageView";

export const generateMetadata = () => contentPageMetadata("user-data-deletion");

export default function UserDataDeletionPage() {
  return <ContentPageView slug="user-data-deletion" />;
}
