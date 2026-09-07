import CartItem from "@/components/cart/CartItem";
import CartItemQtyUpdate from "@/components/cart/CartItemQtyUpdate";
import { Truck } from "lucide-react";
import CheckOutSubTotal from "./CheckOutSubTotal";

export default function BuyNowProductDetails({
  deliveryArea,
  data,
  productQty = 1,
  setProductQty,
  variationId = null,
  setDeliveryCharge,
  setTotalPrice,
  setOrderWeight,
  deliveryRates,
}) {
  let totalPrices;
  const isArray = Array.isArray(data);

  if (isArray) {
    totalPrices = data.reduce(
      (acc, item) => {
        const qty = item.quantity || 1;
        acc.totalDiscountPrice += (item.discountPrice || 0) * qty;
        acc.totalRegularPrice += (item.regularPrice || 0) * qty;
        acc.totalWeight += (item.weight || 1) * qty;

        return acc;
      },
      { totalDiscountPrice: 0, totalRegularPrice: 0, totalWeight: 0 },
    );
  } else {
    totalPrices = {
      totalDiscountPrice: data.discountPrice * productQty || 0,
      totalRegularPrice: data.regularPrice * productQty || 0,
      totalWeight: data.weight * productQty || 1,
    };
  }

  return (
    <>
      <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
        <Truck /> <span>অর্ডার বিস্তারিত</span>
      </div>
      {!!Array.isArray(data) ? (
        data &&
        data?.map((product) => {
          return (
            <CartItemQtyUpdate
              key={product?.variation?.id || product?.id}
              data={product}
            />
          );
        })
      ) : (
        <CartItem
          title={data.title}
          thumbnail={data?.thumbnail}
          slug={data.slug}
          discountPrice={data.discountPrice}
          regularPrice={data.regularPrice}
          setProductQy={setProductQty}
          productQty={productQty}
          removeItem={() => {}}
          variation={data?.variation}
          id={data.id}
        />
      )}

      <CheckOutSubTotal
        deliveryArea={deliveryArea}
        discountPrice={totalPrices.totalDiscountPrice}
        regularPrice={totalPrices.totalRegularPrice}
        totalWeight={totalPrices.totalWeight}
        setTotalPrice={setTotalPrice}
        setDeliveryCharge={setDeliveryCharge}
        setOrderWeight={setOrderWeight}
        deliveryRates={deliveryRates}
      />
    </>
  );
}
