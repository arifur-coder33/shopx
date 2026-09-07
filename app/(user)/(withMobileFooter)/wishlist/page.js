import Breadcrumb from "@/components/common/Breadcrumb";
import WishlistPageClient from "@/components/wishlist/WishlistPageClient";

export const metadata = {
  title: "পছন্দের তালিকা",
  robots: { index: false, follow: true },
};

export default function WishlistPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "পছন্দের তালিকা" }]} className="mb-2" />
      <WishlistPageClient />
    </>
  );
}
