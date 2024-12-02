"use client";
import CheckoutProductDetails from "@/components/checkout/CheckOutProductDetails";
import DeliveryAddress from "@/components/checkout/DeliveryAddress";
import { Truck } from "lucide-react";
import { Suspense, useState } from "react";

export default function CheckOutDetails({productId, from }) {
  const [deliveryArea, setDeliveryArea] = useState();
  return (
    <form>
      <div className="flex md:flex-nowrap flex-wrap-reverse md:gap-12 gap-3  ">
        <div className="w-full md:w-1/2">
        
        <CheckoutProductDetails from={from} deliveryArea={deliveryArea} productId={productId}/>

    
        </div>
        <div className="w-full md:w-1/2">
          <div className=" mx-auto">
            <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
              <Truck /> <span>ডেলিভারি ঠিকানাঃ</span>
            </div>
            <DeliveryAddress setDeliveryArea={setDeliveryArea} />
          </div>
        </div>
      </div>
      <div className="w-full z-30 bg-purple p-2 sticky bottom-0 left-0 border-b-8 border-b-purple-800 rounded-lg text-center cursor-pointer hover:border-b-0 my-1.5 text-slate-200 ">
        অর্ডার নিশ্চিত করুন।
      </div>
    </form>
  );
}
