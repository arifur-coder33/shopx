"use client";

import { searchProducts } from "@/backend/serverActions/productActions";
import ProductCard from "@/components/products/ProductCard";
import ProductFilters from "@/components/products/ProductFilters";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export default function SearchProductGrid({ query, filters, initialProducts, initialCursor, queryString }) {
  const [products, setProducts] = useState(initialProducts);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const loaderRef = useRef(null);

  const loadMore = useCallback(() => {
    if (!cursor || pending) return;
    setError("");
    startTransition(async () => {
      const result = await searchProducts(query, filters, cursor);
      if (!result?.success) {
        setError(result?.error || "আরও পণ্য লোড করা যায়নি");
        return;
      }
      setProducts((current) => {
        const known = new Set(current.map((product) => product.id));
        return [...current, ...result.data.filter((product) => !known.has(product.id))];
      });
      setCursor(result.nextCursor);
    });
  }, [cursor, filters, pending, query]);

  useEffect(() => {
    const target = loaderRef.current;
    if (!target || !cursor || error) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { rootMargin: "500px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, error, loadMore]);

  return <>
    <div className="mb-3 flex justify-end"><ProductFilters baseHref="/search" queryString={queryString} activeFilters={filters} /></div>
    {products.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {products.map((item, index) => <ProductCard key={item.id} product={item} priority={index < 2} />)}
    </div> : <p className="py-8 text-center text-text-muted">এই filter-এ কোনো পণ্য পাওয়া যায়নি।</p>}
    <div ref={loaderRef} className="flex min-h-12 items-center justify-center py-3">
      {pending && <span className="text-sm text-text-muted">আরও পণ্য আসছে…</span>}
      {!pending && error && <button type="button" onClick={loadMore} className="button">আবার চেষ্টা করুন</button>}
      {!cursor && products.length > 0 && <span className="text-sm text-text-muted">সব পণ্য দেখা হয়েছে</span>}
    </div>
  </>;
}
