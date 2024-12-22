import PaymentMethodSelector from "@/components/checkout/PaymentMethodSelector";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { Truck } from "lucide-react";
import { useState } from "react";
import CheckoutItem from "./CheckOutItem";

export default function BuyNowProductDetails({
  deliveryArea,
  data,
  setPaymentMethod,
  initialQty
}) {
  const {
    regularPrice,

    discountPrice,

    insideDhaka,
    outSideDhaka,
    category: { name },
  } = data || {};

  let deliveryCharge = 0;
  deliveryCharge = deliveryArea === "inside-dhaka" ? insideDhaka : outSideDhaka;
  const [productQty, setProductQty] = useState(Number(initialQty));
  return (
    <>
      <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
        <Truck /> <span>অর্ডার বিস্তারিত</span>
      </div>

      {/* <CartItem data={data} removeItem={"hide"} setProductQty={setProductQty} /> */}
      <CheckoutItem data={data} productQty={productQty} setProductQy={setProductQty}/>
      <Item label={"পণ্যর রেগুলার মোট মুল্যঃ"} value={regularPrice * productQty} />
      <Item label={"পণ্যর ডিস্কাউন্ট মোট মুল্যঃ"} value={discountPrice * productQty} />
      <Item label={"ডিস্কাউন্টঃ (-)"} value={(regularPrice - discountPrice)*productQty} />
      <Item label={"ডেলিভারি চার্জঃ (+)"} value={deliveryCharge} />
      <input
        hidden
        name="orderPrice"
        defaultValue={discountPrice * productQty}
      />
      <Item
        label={"সর্বোমোট মুল্যঃ"}
        value={discountPrice * productQty + deliveryCharge}
        className={
          "font-bold border-t-4 border-t-slate-800 dark:border-t-slate-200"
        }
      />
      <PaymentMethodSelector
        className="mt-2"
        setPaymentMethod={setPaymentMethod}
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
