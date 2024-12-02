"use client";
import { useCart } from "@/context/CartContext";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { Truck } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import CartItem from "../cart/CartItem";
import Imagecustom from "../images/ImageCustom";
export default function CheckoutProductDetails({
  slug,
  from,
  deliveryArea,
  data,
}) {
  const [orderItems, setOrderItems] = useState([]);
  const { cartItems, totalCartPrice } = useCart();

  console.log(orderItems.length);
  useEffect(() => {
    if (from === "cart") {
      setOrderItems(cartItems);
    } else if (from === "directBuy") {
      // async function buyNowProductSet(params) {
      //   const getData = await getProductBySlug(params);

      //   const buyNowProduct = { ...getData?.data, quantity: 1 };
      //   setOrderItems([buyNowProduct]);
      // }
      // buyNowProductSet(slug);
      const buyNowProduct = { ...data, quantity: 1 };
      setOrderItems([buyNowProduct]);
    }
  }, [from, cartItems, data]);

  const totalProductPrice = useMemo(() => {
    return orderItems.reduce(
      (total, item) => total + item.discountPrice * item.quantity,
      0
    );
  }, [orderItems]);

  const deliveryCharge = deliveryArea === "inside-dhaka" ? 90 : 120;
  return (
    <>
      <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
        <Truck /> <span>অর্ডার বিস্তারিত</span>
      </div>
      {/* <Suspense fallback={<p className="bg-red-500 h-64 w-64"> Loading ..........</p>}> */}
      {!orderItems.length > 0 ? (
        <Democart />
      ) : (
        <>
          {orderItems.map((item) => (
            <CartItem key={item.id} data={item} removeItem={"hide"} />
          ))}
        </>
      )}

      <Suspense
        fallback={<p className="bg-red-500 h-64 w-64"> Loading ..........</p>}
      >
        {orderItems.map((item) => (
          <CartItem key={item.id} data={item} removeItem={"hide"} />
        ))}
      </Suspense>
      <Item label={"পণ্যর মোট মুল্যঃ"} value={totalProductPrice} />
      <Item label={"ডিস্কাউন্টঃ"} value={100} />
      <Item label={"ডেলিভারি চার্জঃ"} value={deliveryCharge} />
      <Item
        label={"সর্বোমোট মুল্যঃ"}
        value={
          totalProductPrice ? totalProductPrice : "loading" + deliveryCharge
        }
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

function Democart() {
  return (
    <div className="grid grid-cols-12 gap-1 w-full text-[12px] text-slate-900 dark:text-slate-200 p-2 mt-2 border-2 items-center dark:border-slate-800 border-gray-500 rounded-md ">
      <div className="col-span-3">
        <Imagecustom
          alt={"img"}
          src={
            "https://res.cloudinary.com/dzptdokx9/image/upload/v1732900774/product_ggsev9.webp"
          }
          w={75}
          h={75}
          priority={true}
        />
      </div>
      <div className="col-span-8 leading-none ">
        <h1 className="text-base line-clamp-1">...........</h1>
        <div className="grid p-0 m-0 grid-cols-2">
          <span>Size: ...</span>
          <span>Size: ....</span>
          <span>পরিমান: ...</span>
          <span>মূল্য: .... টাকা </span>
        </div>
      </div>

      <div className="col-span-12 text-center text-white bg-gray-500 dark:bg-slate-800">
        মোট মুল্যঃ ..... টাকা
      </div>
    </div>
  );
}
