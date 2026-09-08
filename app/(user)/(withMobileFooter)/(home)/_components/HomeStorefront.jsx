import { getHomeStorefrontData } from "@/backend/serverActions/homeStorefrontActions";
import ProductCard from "@/components/products/ProductCard";
import WishlistHydrationSync from "@/components/wishlist/WishlistHydrationSync";
import InfiniteProductGrid from "./InfiniteProductGrid";
import ShopByCategory from "./ShopByCategory";

export default async function HomeStorefront() {
  const result = await getHomeStorefrontData();

  if (!result?.success) {
    return (
      <p className="mt-6 rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger">
        হোমপেজের পণ্য এখন লোড করা যাচ্ছে না।
      </p>
    );
  }

  return (
    <>
      <ShopByCategory categories={result.categories} />

      {result.featured.products.length > 0 && (
        <section className="mt-7" aria-labelledby="featured-products-title">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              আমাদের পছন্দ
            </p>
            <h2
              id="featured-products-title"
              className="text-xl font-bold sm:text-2xl"
            >
              ফিচার্ড পণ্য
            </h2>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
            {result.featured.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <WishlistHydrationSync />
        </section>
      )}

      {result.regular.products.length > 0 && (
        <section className="mt-7" aria-labelledby="all-products-title">
          <h2 id="all-products-title" className="mb-3 text-xl font-bold sm:text-2xl">
            সকল পণ্য
          </h2>
          <InfiniteProductGrid
            initialProducts={result.regular.products}
            initialCursor={result.regular.nextCursor}
          />
        </section>
      )}
    </>
  );
}
