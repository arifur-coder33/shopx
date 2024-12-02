export const dynamic = "force-static"; // Ensures the page is statically generated

import ProductCard from "@/components/products/ProductCard";
import ProductList from "@/components/products/productList";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import HeroSection from "./_components/HeroSection";

const getProducts = unstable_cache(
  async () => {
    return await prisma.product.findMany();
  },
  ["products"],
  { revalidate: 3600, tags: ["products"] }
);

export default async function Home() {
  const allProduct = await getProducts();
  return (
    <>
      <HeroSection />
      <ProductList headerName={"টপ প্রোডাক্ট"}>
        {allProduct?.length > 0 &&
          allProduct?.map((product) => (
            <ProductCard
              key={product?.id}
              productId={product?.slug}
              productName={product?.title}
              regularPrice={product?.regularPrice}
              discountPrice={product?.discountPrice}
              imageSrc={product?.images[0]}
              slug={product?.slug}
            />
          ))}
      </ProductList>
    </>
  );
}
