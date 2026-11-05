"use client";
import KalapanaFont from "@/components/KalapanaFont";
import IncrementNDcrement from "@/components/products/incrementNDcrement";
import { useState } from "react";
import ActionButtons from "./ActionButtons";
import EMISection from "./EMI/EMISection";

export default function BuyNowSection({ data, selectedVariation }) {
  const [productQty, setProductQty] = useState(1);
  const prices = (selectedVariation ? [selectedVariation] : data.variations || []).map((variation) => {
    if (variation.campaignPrice != null) return Number(variation.campaignPrice);
    const regular = Number(variation.regularPrice) || 0;
    const discount = Number(variation.discountPrice) || 0;
    return discount > 0 && discount < regular ? discount : regular;
  }).filter((price) => price > 0);
  const emiAmount = (prices.length ? Math.min(...prices) : 0) * productQty;
  return (
    <>
      <KalapanaFont>
        <div className="dark:text-slate-300 text-2xl">
          <div className="flex flex-row items-center text-center">
            <label htmlFor="qtyinput">পরিমানঃ</label>
            <IncrementNDcrement
              initialQty={productQty}
              incrementHandler={setProductQty}
              decrementHandler={setProductQty}
            />
          </div>
        </div>
      </KalapanaFont>
      <ActionButtons
        productQty={productQty}
        product={data}
        selectedVariation={selectedVariation}
      />
      <EMISection price={emiAmount} configuration={data.emi} />
    </>
  );
}
