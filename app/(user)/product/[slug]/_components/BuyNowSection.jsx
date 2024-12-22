"use client";
import KalapanaFont from "@/components/KalapanaFont";
import IncrementNDcrement from "@/components/products/incrementNDcrement";
import { useState } from "react";
import ActionButtons from "./ActionButtons";

export default function BuyNowSection({ data }) {
  const [productQty, setProductQty] = useState(1);
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
      <ActionButtons productQty={productQty} product={data} />
    </>
  );
}
