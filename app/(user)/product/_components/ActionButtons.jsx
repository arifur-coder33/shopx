import AddToCartButton from "@/components/products/addToCartButton";
import BuyNowButton from "@/components/products/buyNowButton";

export default function ActionButtons({
  product,
  productQty,
  selectedVariation,
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-border bg-surface p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:static sm:mt-4 sm:border-0 sm:bg-transparent sm:p-0">
      {/* Add to cart button  */}

      <AddToCartButton
        product={product}
        productQty={productQty}
        selectedVariation={selectedVariation}
        className="w-full min-h-12 text-base sm:text-xl"
      />

      {/* buy now button  */}
      <div className="relative ">
        <BuyNowButton
          product={product}
          selectedVariation={selectedVariation}
          slug={`${product?.slug}?qty=${productQty}${
            selectedVariation?.id ? `&v=${selectedVariation?.id}` : ""
          }`}
          bgcolor="bg-purple"
          className={
            "button min-h-12 w-full text-base sm:text-xl"
          }
        />

        <span className="animate-ping absolute -top-1 z-0 -left-1 h-3 w-3 rounded-full bg-purple opacity-90"></span>
      </div>
    </div>
  );
}
