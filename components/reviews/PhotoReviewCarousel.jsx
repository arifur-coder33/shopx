"use client";

import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useRef } from "react";

export default function PhotoReviewCarousel({ reviews, title = "Customer reviews", subtitle, className = "my-8" }) {
  const railRef = useRef(null);
  if (!reviews?.length) return null;

  const scroll = (direction) => railRef.current?.scrollBy({ left: direction * Math.max(280, railRef.current.clientWidth * 0.78), behavior: "smooth" });

  return (
    <section className={className} aria-label={title}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div><h2 className="text-xl font-bold sm:text-2xl">{title}</h2>{subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}</div>
        {reviews.length > 1 && <div className="flex gap-2"><button type="button" onClick={() => scroll(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface hover:bg-surface-muted" aria-label="Previous reviews"><ChevronLeft size={18} /></button><button type="button" onClick={() => scroll(1)} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface hover:bg-surface-muted" aria-label="Next reviews"><ChevronRight size={18} /></button></div>}
      </div>
      <div ref={railRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:thin]">
        {reviews.map((review) => (
          <article key={review.id} className="w-[min(78vw,260px)] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-surface shadow-sm sm:w-[260px]">
            <div className="aspect-[4/5] overflow-hidden bg-surface-muted">{review.image?.name || review.image?.url ? <img src={cloudinaryMainImage(review.image.name || review.image.url, 520)} alt={review.image.displayName || `${title} photo`} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center bg-primary-soft px-5 text-center text-primary"><span className="text-4xl font-black">“</span><span className="line-clamp-5 text-sm font-medium">{review.reviewText || "Customer review"}</span></div>}</div>
            <div className="space-y-2 p-3">
              {review.rating && <div className="flex gap-0.5 text-amber-500" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: review.rating }, (_, i) => <Star key={i} size={14} fill="currentColor" />)}</div>}
              {review.reviewText && <p className="line-clamp-3 text-sm leading-6 text-text">{review.reviewText}</p>}
              {review.customerName && <p className="truncate text-sm font-semibold text-text-muted">{review.customerName}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
