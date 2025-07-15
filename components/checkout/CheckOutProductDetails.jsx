"use client";
import { useCart } from "@/context/CartContext";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { Truck } from "lucide-react";
import { Suspense, useState } from "react";
import CartItems from "../cart/CartItems";
export default function CheckoutProductDetails({ deliveryArea }) {
  const [orderItems, setOrderItems] = useState([]);
  const { totalCartPrice, totalCartRegularPrice } = useCart();

  const deliveryCharge = deliveryArea == "dhaka" ? 90 : 120;

  return (
    <>
      <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
        <Truck /> <span>অর্ডার বিস্তারিত</span>
      </div>

      <Suspense
        fallback={<p className="bg-red-500 h-64 w-64"> Loading ..........</p>}
      >
        <CartItems />
      </Suspense>
      <Item label={"পণ্যর মোট মুল্যঃ"} value={totalCartRegularPrice} />
      <Item
        label={"ডিস্কাউন্টঃ"}
        value={totalCartRegularPrice - totalCartPrice}
      />
      <Item label={"ডেলিভারি চার্জঃ"} value={deliveryCharge} />
      <Item
        label={"সর্বোমোট মুল্যঃ"}
        value={totalCartPrice + deliveryCharge}
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
      <p>{isNaN(value) ? "Loading" : replaceNumbers(value.toString())} টাকা</p>
    </div>
  );
}
