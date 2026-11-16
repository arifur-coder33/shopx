"use client";

import { getSimilarProductsPage } from "@/backend/serverActions/storefrontRecommendationAction";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

function ProductRail({ products, title }) {
  const railRef = useRef(null);
  const scroll = (direction) => railRef.current?.scrollBy({
    left: direction * Math.max(260, railRef.current.clientWidth * 0.8),
    behavior: "smooth",
  });

  if (!products.length) return null;
  return (
    <div className="relative">
      {products.length > 1 && <div className="mb-2 flex justify-end gap-2">
        <button type="button" onClick={() => scroll(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface hover:bg-surface-muted" aria-label={`Previous ${title}`}><ChevronLeft size={18} /></button>
        <button type="button" onClick={() => scroll(1)} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface hover:bg-surface-muted" aria-label={`Next ${title}`}><ChevronRight size={18} /></button>
      </div>}
      <div ref={railRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:thin]">
        {products.map((product) => {
          const price = Number(product.discountPrice) > 0 ? Number(product.discountPrice) : Number(product.regularPrice) || 0;
          const regularPrice = Number(product.regularPrice) || 0;
          return (
            <Link key={product.id} href={`/product/${encodeURIComponent(product.slug)}`} className="w-[min(68vw,210px)] shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-surface transition hover:border-primary sm:w-[210px]">
              <div className="aspect-square bg-surface-muted">
                {product.image ? <img src={cloudinaryMainImage(product.image, 420, 420)} alt={product.title} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs text-text-muted">No image</div>}
              </div>
              <div className="p-3">
                <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">{product.title}</h3>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="font-bold text-primary">৳{new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 2 }).format(price)}</span>
                  {regularPrice > price && <del className="text-xs text-text-muted">৳{new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 2 }).format(regularPrice)}</del>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function ProductRecommendations({ currentProduct }) {
  const [similarProducts, setSimilarProducts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const sectionRef = useRef(null);
  const requestedRef = useRef(false);
  const hasSimilarProducts = similarProducts.length > 0;

  const loadSimilar = useCallback(async (cursor = null) => {
    if (loading || (!currentProduct?.categoryId && !cursor)) return;
    setLoading(true);
    setError("");
    try {
      const result = await getSimilarProductsPage(currentProduct.categoryId, currentProduct.id, cursor);
      if (!result?.success) {
        setError("একই ক্যাটাগরির পণ্য লোড করা যায়নি। আবার চেষ্টা করুন।");
        return;
      }
      setSimilarProducts((items) => cursor ? [...items, ...result.products] : result.products);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
      setLoaded(true);
    } catch {
      setError("একই ক্যাটাগরির পণ্য লোড করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }, [currentProduct?.categoryId, currentProduct?.id, loading]);

  useEffect(() => {
    const target = sectionRef.current;
    if (!target || loaded || requestedRef.current || !currentProduct?.categoryId) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || requestedRef.current) return;
      requestedRef.current = true;
      loadSimilar();
    }, { rootMargin: "420px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [currentProduct?.categoryId, loadSimilar, loaded]);

  if (!hasSimilarProducts) {
    if (loaded || (!currentProduct?.categoryId && !error)) return null;
    if (!error) return <div ref={sectionRef} className="h-px w-full" aria-hidden="true" />;
  }

  return (
    <section ref={sectionRef} className="mt-8 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6" aria-label="একই ক্যাটাগরির আরও পণ্য">
      <div className="mb-4">
        <h2 className="text-xl font-bold sm:text-2xl">একই ক্যাটাগরির আরও পণ্য</h2>
      </div>
      {similarProducts.length > 0 && <ProductRail products={similarProducts} title="similar products" />}
      {loading && !similarProducts.length && <p className="py-8 text-center text-sm text-text-muted">একই ক্যাটাগরির পণ্য লোড হচ্ছে…</p>}
      {error && <div className="py-3 text-center"><p className="mb-2 text-sm text-danger">{error}</p><button type="button" onClick={() => { requestedRef.current = true; loadSimilar(); }} className="button">আবার চেষ্টা করুন</button></div>}
      {hasMore && <div className="mt-3 text-center"><button type="button" disabled={loading} onClick={() => loadSimilar(nextCursor)} className="button disabled:opacity-50">{loading ? "লোড হচ্ছে…" : "আরও দেখুন"}</button></div>}
    </section>
  );
}
