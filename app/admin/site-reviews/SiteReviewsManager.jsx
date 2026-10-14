"use client";

import { createPhotoReview, deletePhotoReview, updatePhotoReviewVisibility } from "@/backend/serverActions/photoReviewActions";
import FileInput from "@/components/input/FileInput";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

const inputClass = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-text outline-none focus:border-primary";

export default function SiteReviewsManager({ initialData }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [reviews, setReviews] = useState(initialData.reviews);
  const [formVersion, setFormVersion] = useState(0);
  const [pending, startTransition] = useTransition();
  const permissions = session?.user?.permissions || [];
  const canCreate = hasUIPermission(permissions, "contentPage", "create");
  const canUpdate = hasUIPermission(permissions, "contentPage", "update");
  const canDelete = hasUIPermission(permissions, "contentPage", "delete");

  const submit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await createPhotoReview(data);
      if (!result.success) return toast.error(result.message);
      toast.success(result.message);
      form.reset();
      setFormVersion((version) => version + 1);
      router.refresh();
    });
  };

  const toggle = (review) => startTransition(async () => {
    const result = await updatePhotoReviewVisibility(review.id, !review.isPublished);
    if (!result.success) return toast.error(result.message);
    setReviews((rows) => rows.map((row) => row.id === review.id ? { ...row, isPublished: !row.isPublished } : row));
    toast.success(result.message);
  });

  const remove = (review) => {
    if (!window.confirm(`Delete this ${review.product ? "product" : "site"} review photo?`)) return;
    startTransition(async () => {
      const result = await deletePhotoReview(review.id);
      if (!result.success) return toast.error(result.message);
      setReviews((rows) => rows.filter((row) => row.id !== review.id));
      toast.success(result.message);
    });
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-3 pb-10 sm:p-5">
      <header className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-xl bg-primary-soft p-3 text-primary"><ImagePlus size={22} /></span><div><h1 className="text-2xl font-bold">Site Review</h1><p className="mt-1 text-sm text-text-muted">These photos appear in the review carousel above the home page footer. Product reviews are managed in each product form.</p></div></div></header>

      <form key={formVersion} onSubmit={submit} className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2"><h2 className="text-lg font-bold">Add a site photo review</h2><p className="text-sm text-text-muted">Use each product’s add/edit form to manage its product photo reviews.</p></div>
        <FileInput name="image" label="Review photo" recommendedSize="800 × 1000 px recommended" w={128} h={160} />
        <label className="grid gap-1.5 text-sm font-semibold">Customer name (optional)<input name="customerName" maxLength={120} className={inputClass} placeholder="Customer name" /></label>
        <label className="grid gap-1.5 text-sm font-semibold">Rating (optional)<select name="rating" defaultValue="" className={inputClass}><option value="">No rating</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Review (optional)<textarea name="reviewText" maxLength={1000} rows={3} className={inputClass} placeholder="Customer feedback" /></label>
        <div className="sm:col-span-2"><button type="submit" disabled={pending || !canCreate} className="button disabled:opacity-50">Add photo review</button>{!canCreate && <p className="mt-2 text-xs text-danger">You do not have permission to add reviews.</p>}</div>
      </form>

      <section className="space-y-3"><div className="flex items-end justify-between"><h2 className="text-lg font-bold">Review photos</h2><span className="text-sm text-text-muted">{reviews.length} total</span></div>
        {reviews.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{reviews.map((review) => <article key={review.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"><div className="flex gap-4 p-3"><img src={cloudinaryMainImage(review.image.name, 320)} alt={review.image.displayName || "Review photo"} className="h-32 w-24 shrink-0 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-primary">Site review</p><h3 className="mt-1 truncate font-semibold">{review.customerName || review.image.displayName || "Photo review"}</h3>{review.rating && <p className="mt-1 flex items-center gap-1 text-sm text-amber-500"><Star size={14} fill="currentColor" />{review.rating}/5</p>}{review.reviewText && <p className="mt-1 line-clamp-2 text-sm text-text-muted">{review.reviewText}</p>}</div></div><div className="flex items-center justify-between border-t border-border px-3 py-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={review.isPublished} disabled={pending || !canUpdate} onChange={() => toggle(review)} /> Published</label><button type="button" onClick={() => remove(review)} disabled={pending || !canDelete} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-danger hover:bg-danger/10 disabled:opacity-40"><Trash2 size={15} /> Delete</button></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-text-muted">No photo reviews have been added yet.</div>}
      </section>
    </main>
  );
}
