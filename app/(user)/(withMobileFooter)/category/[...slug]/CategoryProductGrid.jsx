"use client";

import { getCategoryPageData } from "@/backend/serverActions/catagoryActions";
import ProductCard from "@/components/products/ProductCard";
import WishlistHydrationSync from "@/components/wishlist/WishlistHydrationSync";
import ProductFilters from "@/components/products/ProductFilters";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export default function CategoryProductGrid({ initialProducts, initialCursor, categorySlug, variationOptions = [] }) {
  const [products, setProducts] = useState(initialProducts);
  const [cursor, setCursor] = useState(initialCursor);
  const [filters, setFilters] = useState({});
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const loaderRef = useRef(null);

  const applyFilters = useCallback((nextFilters) => {
    setError("");
    startTransition(async () => {
      const result = await getCategoryPageData(categorySlug, null, nextFilters);
      if (!result?.success) {
        setError(result?.error || "পণ্য filter করা যায়নি");
        return;
      }
      setFilters(nextFilters);
      setProducts(result.data || []);
      setCursor(result.nextCursor);
    });
  }, [categorySlug]);

  const loadMore = useCallback(() => {
    if (!cursor || isPending) return;
    setError("");
    startTransition(async () => {
      const result = await getCategoryPageData(categorySlug, cursor, filters);
      if (!result?.success) {
        setError(result?.error || "আরও পণ্য লোড করা যায়নি");
        return;
      }
      setProducts((current) => {
        const knownIds = new Set(current.map((product) => product.id));
        return [...current, ...result.data.filter((product) => !knownIds.has(product.id))];
      });
      setCursor(result.nextCursor);
    });
  }, [categorySlug, cursor, filters, isPending]);

  useEffect(() => {
    const target = loaderRef.current;
    if (!target || !cursor || error) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { rootMargin: "500px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, error, loadMore]);

  return (
    <>
      <div className="mb-3 flex justify-end"><ProductFilters activeFilters={filters} variationOptions={variationOptions} onApply={applyFilters} onClear={() => applyFilters({})} /></div>
      {products.length ? (
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((product, index) => (
            <div key={product.id} className={index >= initialProducts.length ? "home-product-reveal" : undefined}>
              <ProductCard product={product} priority={index < 2} />
            </div>
          ))}
        </div>
      ) : <p>No Product found.</p>}
      <WishlistHydrationSync />
      <div ref={loaderRef} className="flex min-h-12 items-center justify-center py-3">
        {isPending && <span className="text-sm text-text-muted">আরও পণ্য আসছে…</span>}
        {!isPending && error && <button type="button" onClick={loadMore} className="button">আবার চেষ্টা করুন</button>}
        {!cursor && products.length > 0 && <span className="text-sm text-text-muted">সব পণ্য দেখা হয়েছে</span>}
      </div>
    </>
  );
}
