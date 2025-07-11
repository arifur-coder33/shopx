import CartItem from "@/components/cart/CartItem";
import { Truck } from "lucide-react";
import { useState } from "react";
import CheckOutSubTotal from "./CheckOutSubTotal";

export default function BuyNowProductDetails({
  deliveryArea,
  data,
  initialQty = 1,
  variationId = null,
}) {
  const [productQty, setProductQty] = useState(Number(initialQty) || 1);

  // const {
  //   title,
  //   slug,
  //   discountPrice,
  //   id,
  //   thumbnail,
  //   mainImage,
  //   variations,
  //   category,
  // } = data || {};
  // const variation = variations?.find((v) => v.id === variationId);
  // const productDiscountPrice =
  //   variation?.discountPrice || data?.discountPrice || 0;
  // const productRegularPrice =
  //   variation?.regularPrice || data?.regularPrice || 0;
  // const totalDiscount = productRegularPrice - productDiscountPrice;
  // const productQtyNumber = Number(productQty) || 1;
  // const mainImageUrl =
  //   variation?.thumbnail?.name || thumbnail?.name || mainImage;

  const totalPrices = data.reduce(
    (acc, item) => {
      const qty = item.quantity || 1;
      acc.totalDiscountPrice += (item.discountPrice || 0) * qty;
      acc.totalRegularPrice += (item.regularPrice || 0) * qty;
      acc.totalWeight += (item.weight || 0) * qty;
      return acc;
    },
    { totalDiscountPrice: 0, totalRegularPrice: 0, totalWeight: 0 }
  );

  return (
    <>
      <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
        <Truck /> <span>অর্ডার বিস্তারিত</span>
      </div>
      {data &&
        data?.map((product) => {
          return (
            <CartItem
              key={product.id}
              title={product.title}
              mainImageUrl={product?.mainImageUrl}
              slug={product.slug}
              discountPrice={product.discountPrice}
              regularPrice={product.regularPrice}
              setProductQy={setProductQty}
              productQty={product.quantity || productQty}
              removeItem={() => {}}
              variation={product?.variation}
              id={product.id}
            />
          );
        })}

      <CheckOutSubTotal
        deliveryArea={deliveryArea}
        discountPrice={totalPrices.totalDiscountPrice}
        regularPrice={totalPrices.totalRegularPrice}
        totalWeight={totalPrices.totalWeight}
      />
    </>
  );
}
