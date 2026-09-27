"use client";

import { getPublicCampaignProductPage } from "@/backend/serverActions/publicCampaignActions";
import ProductCard from "@/components/products/ProductCard";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export default function CampaignProductsGrid({ campaignId, initialProducts, total, totalPages }) {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const loaderRef = useRef(null);
  const hasMore = page < totalPages;

  const loadMore = useCallback(() => {
    if (!hasMore || isPending) return;
    setError("");
    startTransition(async () => {
      const nextPage = page + 1;
      const result = await getPublicCampaignProductPage(campaignId, nextPage);
      if (!result) {
        setError("আরও পণ্য লোড করা যায়নি");
        return;
      }
      setProducts((current) => {
        const knownIds = new Set(current.map((product) => product.id));
        return [...current, ...result.products.filter((product) => !knownIds.has(product.id))];
      });
      setPage(nextPage);
    });
  }, [campaignId, hasMore, isPending, page]);

  useEffect(() => {
    const target = loaderRef.current;
    if (!target || !hasMore || error) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { rootMargin: "500px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [error, hasMore, loadMore]);

  return <>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
    <div ref={loaderRef} className="flex min-h-12 items-center justify-center py-3">
      {isPending && <span className="text-sm text-text-muted">আরও পণ্য আসছে…</span>}
      {!isPending && error && <button type="button" onClick={loadMore} className="button">আবার চেষ্টা করুন</button>}
      {!hasMore && <span className="text-sm text-text-muted">সব {total}টি পণ্য দেখা হয়েছে</span>}
    </div>
  </>;
}
