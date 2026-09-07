"use client";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { calculateDeliveryCharge } from "@/lib/deliveryCharge";
import { useEffect } from "react";
export default function CheckOutSubTotal({
  totalWeight,
  deliveryArea,
  discountPrice,
  regularPrice,
  setTotalPrice,
  setOrderWeight,
  setDeliveryCharge,
  deliveryRates,
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
      <Item
        label={"সর্বোমোট মুল্যঃ"}
        value={discountPrice + deliveryCharge || 0}
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
