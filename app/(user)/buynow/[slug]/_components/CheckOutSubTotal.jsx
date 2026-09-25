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
      {campaignPreview?.rows?.map(({ id, name, discount, startAt, endAt }) => <div key={id} className="mt-1 flex items-center justify-between gap-2 rounded-md bg-primary-soft px-2 py-1 text-sm text-primary">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
          <span className="font-medium">{name}</span>
          <CampaignCountdown compact startAt={startAt} endAt={endAt} />
        </span>
        <span className="shrink-0 font-semibold">−{replaceNumbers(Number(discount).toLocaleString("en-US", { maximumFractionDigits: 2 }))} টাকা</span>
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
