import CartItem from "@/components/cart/CartItem";
import { Truck } from "lucide-react";
import { useState } from "react";
import CheckOutSubTotal from "./CheckOutSubtotal";

export default function BuyNowProductDetails({
  deliveryArea,
  data,
  setPaymentMethod,
  initialQty = 1,
}) {
  const {
    regularPrice,

    discountPrice,

    insideDhaka,
    outSideDhaka,
    category: { name },
  } = data || {};

  const [productQty, setProductQty] = useState(Number(initialQty) || 1);
  return (
    <>
      <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
        <Truck /> <span>অর্ডার বিস্তারিত</span>
      </div>

      <CartItem
        data={data}
        productQty={productQty}
        setProductQy={setProductQty}
        removeItem={true}
      />
      <CheckOutSubTotal
        deliveryArea={deliveryArea}
        data={data}
        productQty={productQty}
      />
    </>
  );
}
