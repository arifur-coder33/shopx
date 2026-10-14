"use client";

import { createCustomerProductReview } from "@/backend/serverActions/customerReviewActions";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { ImagePlus, MessageSquareText, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

const inputClass = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

function ReviewImage({ review, title }) {
  return review.image?.name ? (
    <img src={cloudinaryMainImage(review.image.name, 420)} alt={`${title} review photo`} loading="lazy" className="h-full w-full object-cover" />
  ) : (
    <div className="grid h-full w-full place-items-center bg-primary-soft text-primary"><MessageSquareText size={32} /></div>
  );
}

export default function CustomerProductReviews({ initialData }) {
  const router = useRouter();
  const [eligibleItems, setEligibleItems] = useState(initialData.eligibleItems);
  const [reviews, setReviews] = useState(initialData.reviews);
  const [activeItemId, setActiveItemId] = useState(null);
  const [pending, startTransition] = useTransition();

  const submit = (event, item) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createCustomerProductReview(formData);
      if (!result.success) return toast.error(result.message);
      setEligibleItems((items) => items.filter((row) => row.id !== item.id));
      setReviews((items) => [result.data, ...items]);
      setActiveItemId(null);
      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-1 py-4 sm:px-2">
      <header><h1 className="text-2xl font-bold sm:text-3xl">My Reviews</h1><p className="mt-1 text-sm text-text-muted">Delivered products are eligible for a review. Your reviews appear on their product pages.</p></header>

      <section className="space-y-3" aria-labelledby="review-eligible-title">
        <div className="flex items-center justify-between gap-2"><h2 id="review-eligible-title" className="text-lg font-bold">Products you can review</h2><span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">{eligibleItems.length}</span></div>
        {eligibleItems.length ? eligibleItems.map((item) => {
          const title = item.product?.title || item.productName;
          const imageName = item.product?.thumbnail?.name || item.thumbnail;
          const isOpen = activeItemId === item.id;
          return (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-muted">{imageName ? <img src={cloudinaryMainImage(imageName, 180)} alt={title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-text-muted"><ImagePlus size={20} /></div>}</div>
                <div className="min-w-0 flex-1"><Link href={`/product/${item.product?.slug || ""}`} className="line-clamp-2 font-semibold hover:text-primary">{title}</Link><p className="mt-1 text-xs text-text-muted">Order {item.order.orderNo} · Qty {item.quantity}</p></div>
                <button type="button" onClick={() => setActiveItemId(isOpen ? null : item.id)} className="shrink-0 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90">{isOpen ? "Close" : "Write review"}</button>
              </div>
              {isOpen && <form onSubmit={(event) => submit(event, item)} className="grid gap-3 border-t border-border bg-surface-muted/40 p-3 sm:grid-cols-2 sm:p-4">
                <input type="hidden" name="orderItemId" value={item.id} />
                <label className="grid gap-1.5 text-sm font-semibold">Name <span className="font-normal text-text-muted">(optional)</span><input name="customerName" maxLength={120} className={inputClass} placeholder="Your name" /></label>
                <label className="grid gap-1.5 text-sm font-semibold">Rating <span className="font-normal text-text-muted">(optional)</span><select name="rating" defaultValue="" className={inputClass}><option value="">No rating</option>{[5, 4, 3, 2, 1].map((rating) => <option value={rating} key={rating}>{rating} / 5</option>)}</select></label>
                <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Message <span className="font-normal text-text-muted">(optional)</span><textarea name="reviewText" rows={3} maxLength={1000} className={inputClass} placeholder="How was the product?" /></label>
                <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Photo <span className="font-normal text-text-muted">(optional · JPG, PNG, WebP or GIF · max 5 MB)</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-semibold file:text-primary`} /></label>
                <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button type="submit" disabled={pending} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{pending ? "Submitting…" : "Submit review"}</button><p className="text-xs text-text-muted">Add a message, rating or photo to submit. Name is optional.</p></div>
              </form>}
            </article>
          );
        }) : <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">No delivered products are waiting for a review.</div>}
      </section>

      <section className="space-y-3" aria-labelledby="your-reviews-title">
        <div className="flex items-center justify-between gap-2"><h2 id="your-reviews-title" className="text-lg font-bold">Your submitted reviews</h2><span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-muted">{reviews.length}</span></div>
        {reviews.length ? <div className="grid gap-4 sm:grid-cols-2">{reviews.map((review) => <article key={review.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"><Link href={`/product/${review.product.slug}`} className="flex gap-3 p-3"><div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-muted"><ReviewImage review={review} title={review.product.title} /></div><div className="min-w-0 flex-1"><p className="line-clamp-2 font-semibold hover:text-primary">{review.product.title}</p><p className="mt-1 text-xs text-text-muted">Order {review.orderItem?.order?.orderNo || "—"}</p>{review.rating && <span className="mt-2 inline-flex items-center gap-1 text-sm text-amber-500"><Star size={15} fill="currentColor" />{review.rating}/5</span>}{review.reviewText && <p className="mt-2 line-clamp-3 text-sm text-text-muted">{review.reviewText}</p>}{review.customerName && <p className="mt-2 truncate text-xs font-semibold text-text-muted">{review.customerName}</p>}</div></Link></article>)}</div> : <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">Reviews you submit will appear here.</div>}
      </section>
    </main>
  );
}
