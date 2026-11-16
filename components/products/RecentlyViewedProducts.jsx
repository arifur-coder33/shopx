"use client";

import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import {
  readRecentlyViewedProducts,
  RECENTLY_VIEWED_PRODUCTS_EVENT,
  RECENTLY_VIEWED_PRODUCTS_KEY,
  removeRecentlyViewedProduct,
} from "@/utils/recentlyViewedProducts";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

function priceLabel(value) {
  return new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 2 }).format(Number(value) || 0);
}

export default function RecentlyViewedProducts() {
  const [products, setProducts] = useState([]);
  const railRef = useRef(null);

  const refresh = useCallback(() => setProducts(readRecentlyViewedProducts()), []);

  useEffect(() => {
    refresh();
    window.addEventListener(RECENTLY_VIEWED_PRODUCTS_EVENT, refresh);
    const onStorage = (event) => {
      if (event.key === RECENTLY_VIEWED_PRODUCTS_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(RECENTLY_VIEWED_PRODUCTS_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  if (!products.length) return null;

  const scroll = (direction) => railRef.current?.scrollBy({
    left: direction * Math.max(260, railRef.current.clientWidth * 0.8),
    behavior: "smooth",
  });

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6" aria-label="সম্প্রতি দেখা পণ্য">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">সম্প্রতি দেখা পণ্য</h2>
          <p className="mt-1 text-sm text-text-muted">আপনি আগে যে পণ্যগুলো দেখেছেন</p>
        </div>
        {products.length > 1 && <div className="flex gap-2">
          <button type="button" onClick={() => scroll(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface hover:bg-surface-muted" aria-label="আগের সম্প্রতি দেখা পণ্য"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => scroll(1)} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface hover:bg-surface-muted" aria-label="পরের সম্প্রতি দেখা পণ্য"><ChevronRight size={18} /></button>
        </div>}
      </div>
      <div ref={railRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:thin]">
        {products.map((product) => {
          const price = Number(product.discountPrice) > 0 ? product.discountPrice : product.regularPrice;
          const regularPrice = Number(product.regularPrice) || 0;
          return (
            <article key={product.id} className="relative w-[min(68vw,210px)] shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-surface sm:w-[210px]">
              <button type="button" onClick={() => setProducts(removeRecentlyViewedProduct(product.id))} className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-surface/95 text-text shadow-md hover:bg-danger hover:text-white" aria-label={`সম্প্রতি দেখা তালিকা থেকে ${product.title} সরান`} title="তালিকা থেকে সরান"><X size={17} /></button>
              <Link href={`/product/${encodeURIComponent(product.slug)}`} className="block transition hover:opacity-90">
                <div className="aspect-square bg-surface-muted">
                  {product.image ? <img src={cloudinaryMainImage(product.image, 420, 420)} alt={product.title} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs text-text-muted">ছবি নেই</div>}
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">{product.title}</h3>
                  {price != null && <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span className="font-bold text-primary">৳{priceLabel(price)}</span>
                    {regularPrice > Number(price) && <del className="text-xs text-text-muted">৳{priceLabel(regularPrice)}</del>}
                  </div>}
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
