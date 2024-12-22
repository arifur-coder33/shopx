export const dynamic = "force-static";
import {
  getProductBySlug,
  getProducts,
} from "@/backend/serverActions/productActions";

import { unstable_cache } from "next/cache";
import BuyNowCheckout from "./_components/BuyNowCheckout";

export async function generateStaticParams() {
  const data = await getProducts();
  return data?.data.map((product) => ({
    slug: product.slug,
  }));
}

export default async function ProductPage({ params }) {
  const { slug } = await params;

  const getProduct = unstable_cache(
    async () => {
      const data = await getProductBySlug(slug);
      return data?.data;
    },
    [slug],
    { revalidate: 60, tags: [`product-${slug}`] } // Use string array for tags
  );

  const data = await getProduct();

  return (
    <div className="pt-4">
  
      <BuyNowCheckout data={data} />
    </div>
  );
}
