"use client";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { useEffect } from "react";
export default function CheckOutSubTotal({
  totalWeight,
  deliveryArea,
  discountPrice,
  regularPrice,
  setTotalPrice,
  setOrderWeight,
  setDeliveryCharge,
}) {
  let deliveryCharge = 0;
  deliveryCharge = deliveryArea == "inside-dhaka" ? 80 : 100;
  const extraCharge = totalWeight > 1 ? Math.ceil(Number(totalWeight)) * 20 : 0;
  console.log("extrachage", extraCharge);
  useEffect(() => {
    setTotalPrice(discountPrice);
    setOrderWeight(totalWeight);
    setDeliveryCharge(deliveryCharge + extraCharge);
  }, [
    discountPrice,
    setTotalPrice,
    totalWeight,
    setOrderWeight,
    deliveryCharge,
    extraCharge,
    setDeliveryCharge,
  ]);
  return (
    <>
      <Item label={"পণ্যর  মোট মুল্যঃ"} value={discountPrice} />

      <Item
        label={"ডেলিভারি চার্জঃ (+)"}
        value={deliveryCharge + extraCharge || 0}
      />
      {/* <input hidden name="orderPrice" defaultValue={discountPrice} /> */}
      <Item
        label={"সর্বোমোট মুল্যঃ"}
        value={discountPrice + deliveryCharge + extraCharge || 0}
        className={
          "font-bold border-t-4 border-t-slate-800 dark:border-t-slate-200"
        }
      />
      {/* <input
        hidden
        name="deliveryCharge"
        defaultValue={Number(deliveryCharge + extraCharge)}
      /> */}
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
