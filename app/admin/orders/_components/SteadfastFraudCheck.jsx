"use client";

import { getSteadfastFraudCheckAction } from "@/backend/serverActions/courierAction";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

const bandLabels = {
  none: "শেষ হওয়া parcel নেই",
  low: "কম · ১–৫টি",
  medium: "মাঝারি · ৬–২০টি",
  high: "বেশি · ২১–২০০টি",
  very_high: "অনেক · ২০০+টি",
};

function ratioLabel(value) {
  return value == null ? "শেষ হওয়া parcel-এর রেকর্ড নেই" : `${value}%`;
}

export default function SteadfastFraudCheck({ orderId, initialData = null, checkedAt = null }) {
  const [data, setData] = useState(initialData);
  const [savedAt, setSavedAt] = useState(checkedAt);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (loading || data) return;
    setLoading(true);
    setError("");
    try {
      const result = await getSteadfastFraudCheckAction(orderId);
      if (!result?.success) {
        setError(result?.error || "Steadfast check করা যায়নি।");
        return;
      }
      setData(result.data);
      setSavedAt(result.checkedAt || new Date().toISOString());
    } catch (requestError) {
      setError(requestError?.message || "Steadfast check করা যায়নি।");
    } finally {
      setLoading(false);
    }
  };

  const categories = Object.entries(data?.fraudCategories || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  return (
    <section className="mt-3 rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Steadfast · customer parcel history
        </div>
        {!data && <button type="button" onClick={check} disabled={loading} className="min-h-8 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {loading ? "যাচাই হচ্ছে…" : "চেক করুন"}
        </button>}
      </div>

      {error && <p role="status" className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900">{error}</p>}
      {data && <>
        {savedAt && <p className="mt-1 text-[10px] text-text-muted">সংরক্ষিত check · {new Date(savedAt).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" })}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-surface-muted/60 p-2.5"><p className="text-[10px] text-text-muted">ডেলিভারি হয়েছে</p><p className="mt-1 text-sm font-bold text-text-primary">{ratioLabel(data.deliveryRatio)}</p></div>
          <div className="rounded-lg bg-surface-muted/60 p-2.5"><p className="text-[10px] text-text-muted">ফেরত/বাতিল</p><p className="mt-1 text-sm font-bold text-text-primary">{ratioLabel(data.cancellationRatio)}</p></div>
          <div className="rounded-lg bg-surface-muted/60 p-2.5"><p className="text-[10px] text-text-muted">parcel volume</p><p className="mt-1 text-sm font-bold text-text-primary">{bandLabels[data.volumeBand] || data.volumeBand}</p></div>
          <div className="rounded-lg bg-surface-muted/60 p-2.5"><p className="text-[10px] text-text-muted">মোট report</p><p className="mt-1 text-sm font-bold text-text-primary">{Number(data.totalReports).toLocaleString("bn-BD")}</p></div>
        </div>
        {categories.length > 0 && <div className="mt-2 rounded-lg bg-surface-muted/60 p-2.5">
          <p className="text-[10px] font-semibold text-text-muted">report category · বেশি report আগে</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {categories.map(([code, count]) => <li key={code} className="rounded-full border border-border bg-surface px-2 py-1 text-[10px] text-text-secondary">{code.replaceAll("_", " ")} · {Number(count).toLocaleString("bn-BD")}</li>)}
          </ul>
        </div>}
        {data.doubtfulReports && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-900">এই নম্বরের report-এর মধ্যে doubtful report আছে।</p>}
        {data.scoringDisabled && <p className="mt-2 text-[10px] leading-4 text-text-muted">Steadfast scoring বন্ধ রেখেছে; score ব্যবহার করা হয়নি। এটি parcel-history signal, চূড়ান্ত সিদ্ধান্ত নয়।</p>}
      </>}
    </section>
  );
}
