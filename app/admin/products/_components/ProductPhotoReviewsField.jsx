"use client";

import FileInput from "@/components/input/FileInput";
import { Images, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const inputClass = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-text outline-none focus:border-primary";

export default function ProductPhotoReviewsField({ reviews = [] }) {
  const [rows, setRows] = useState(() => reviews.map((review) => ({ ...review, formKey: review.id })));

  const addReview = () => setRows((current) => [...current, { formKey: `new-${Date.now()}-${Math.random()}` }]);
  const removeReview = (formKey) => setRows((current) => current.filter((row) => row.formKey !== formKey));

  return (
    <section className="col-span-full space-y-4 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary-soft p-2.5 text-primary"><Images size={20} /></span>
          <div><h2 className="font-bold">Product reviews</h2><p className="mt-1 text-sm text-text-muted">Add optional name, message, rating and photo. These appear on this product’s page. Customers can also review delivered products from My Account.</p></div>
        </div>
        <button type="button" onClick={addReview} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-soft"><Plus size={16} /> Add review</button>
      </div>

      {rows.map((review, index) => (
        <article key={review.formKey} className="grid gap-3 rounded-xl border border-border bg-surface-muted/40 p-3 sm:grid-cols-2 sm:p-4">
          <input type="hidden" name="productReviewId" value={review.id || ""} />
          <div className="flex items-center justify-between sm:col-span-2"><h3 className="text-sm font-bold">Review {index + 1}</h3><button type="button" onClick={() => removeReview(review.formKey)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-danger hover:bg-danger/10"><Trash2 size={14} /> Remove</button></div>
          <FileInput name="productReviewImage" label="Photo (optional)" recommendedSize="800 × 1000 px recommended" defaultValue={review.image ? [review.image] : []} w={96} h={120} />
          <div className="grid content-start gap-3">
            <label className="grid gap-1 text-sm font-semibold">Customer name (optional)<input name="productReviewName" defaultValue={review.customerName || ""} maxLength={120} className={inputClass} placeholder="Customer name" /></label>
            <label className="grid gap-1 text-sm font-semibold">Rating (optional)<select name="productReviewRating" defaultValue={review.rating || ""} className={inputClass}><option value="">No rating</option>{[5, 4, 3, 2, 1].map((rating) => <option value={rating} key={rating}>{rating} / 5</option>)}</select></label>
          </div>
          <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Message (optional)<textarea name="productReviewMessage" defaultValue={review.reviewText || ""} rows={2} maxLength={1000} className={inputClass} placeholder="Customer feedback" /></label>
        </article>
      ))}
      {!rows.length && <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-text-muted">No manual product reviews yet. You can also add a review after a customer’s order is delivered.</p>}
    </section>
  );
}
