"use client";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { calculateDeliveryCharge } from "@/lib/deliveryCharge";
import { useEffect } from "react";
import CampaignCountdown from "@/app/(user)/(withMobileFooter)/campaign/CampaignCountdown";
export default function CheckOutSubTotal({
  totalWeight,
  deliveryArea,
  discountPrice,
  regularPrice,
  setTotalPrice,
  setOrderWeight,
  setDeliveryCharge,
  deliveryRates,
  campaignPreview,
}) {
  const deliveryCharge = calculateDeliveryCharge(deliveryArea, totalWeight, deliveryRates);

  useEffect(() => {
    setTotalPrice(discountPrice);
    setOrderWeight(totalWeight);
    setDeliveryCharge(deliveryCharge);
  }, [
    discountPrice,
    setTotalPrice,
    totalWeight,
    setOrderWeight,
    deliveryCharge,
    setDeliveryCharge,
  ]);
  return (
    <>
      <Item label={"পণ্যর  মোট মুল্যঃ"} value={discountPrice} />

      <Item
        label={"ডেলিভারি চার্জঃ (+)"}
        value={deliveryCharge || 0}
      />
      {campaignPreview?.rows?.map(({ id, name, ruleText, discount, startAt, endAt }) => <div key={id} className="mt-1 rounded-md bg-primary-soft px-2 py-1.5 text-sm text-primary">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
            <span className="font-medium">ক্যাম্পেইন: {name}</span>
            <CampaignCountdown compact startAt={startAt} endAt={endAt} />
          </span>
          <span className="shrink-0 font-semibold">−{replaceNumbers(Number(discount).toLocaleString("en-US", { maximumFractionDigits: 2 }))} টাকা</span>
        </div>
        {ruleText && <p className="mt-0.5 text-xs text-text-muted">{replaceNumbers(ruleText)}</p>}
      </div>)}
      {campaignPreview?.progress?.map(({ id, name, message, current, target, percent }) => <div key={id} className="mt-2 rounded-lg border border-primary/15 bg-primary-soft/40 px-3 py-2">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-text-muted">{name}</p>
            <p className="text-sm font-bold text-primary">{replaceNumbers(message)}</p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-text-muted">{replaceNumbers(Math.floor(percent).toString())}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-300/70 dark:bg-slate-700" role="progressbar" aria-label={message} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(percent)}>
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-text-muted">৳{replaceNumbers(Number(current).toLocaleString("en-US"))} / ৳{replaceNumbers(Number(target).toLocaleString("en-US"))}</p>
      </div>)}
      <Item
        label={"সর্বোমোট মুল্যঃ"}
        value={campaignPreview?.total ?? discountPrice + deliveryCharge}
        className={
          "font-bold border-t-4 border-t-slate-800 dark:border-t-slate-200"
        }
      />
    </>
  );
}

function Item({ label, value, className }) {
  return (
    <div
      className={`${className} flex flex-row justify-between bg-slate-200 dark:bg-inherit dark:border-2 dark:border-slate-800 rounded-md px-2 py-1 mt-1`}
    >
      <p>{label}</p>
      {/* <p>{ replaceNumbers(value.toString())} টাকা</p> */}
      <p>{replaceNumbers(value?.toString())} টাকা</p>
    </div>
  );
}
