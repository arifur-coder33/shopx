"use client";
import { useCart } from "@/context/CartContext";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CartItem from "../cart/CartItem";
export default function CheckoutProductDetails({ from, deliveryArea }) {
  const [orderItems, setOrderItems] = useState([]);
  const { cartItems, totalCartPrice } = useCart();

  useEffect(() => {
    if (from === "cart") {
      setOrderItems(cartItems);
    } else if (from === "directBuy") {
      const buyNowProduct = [
        { name: "Iphone 16 pro", price: 16500, id: "1", quantity: 1 },
      ];
      setOrderItems(buyNowProduct);
    }
  }, [from, cartItems]);

  const totalProductPrice = useMemo(() => {
    return orderItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }, [orderItems]);

  const deliveryCharge = deliveryArea === "inside-dhaka" ? 90 : 120;
  return (
    <>
      <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
        <Truck /> <span>অর্ডার বিস্তারিত</span>
      </div>
      {orderItems.length > 0 && (
        <>
          {orderItems.map((item) => (
            <CartItem key={item.id} data={item} removeItem={"hide"} />
          ))}
        </>
      )}

      <Item label={"পণ্যর মোট মুল্যঃ"} value={totalProductPrice} />
      <Item label={"ডিস্কাউন্টঃ"} value={100} />
      <Item label={"ডেলিভারি চার্জঃ"} value={deliveryCharge} />
      <Item
        label={"সর্বোমোট মুল্যঃ"}
        value={totalProductPrice + deliveryCharge}
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
      <p>{replaceNumbers(value.toString())} টাকা</p>
    </div>
  );
}
