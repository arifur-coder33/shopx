import AddToCartButton from "@/components/products/addToCartButton";
import BuyNowButton from "@/components/products/buyNowButton";
import MobileFixedActionBar from "./MobileFixedActionBar";

export default function ActionButtons({
  product,
  productQty,
  selectedVariation,
}) {
  const buttons = (
    <>
      <AddToCartButton
        product={product}
        productQty={productQty}
        selectedVariation={selectedVariation}
        className="min-h-12 w-full text-base sm:text-xl"
      />
      <div className="relative">
        <BuyNowButton
          product={product}
          selectedVariation={selectedVariation}
          slug={`${product?.slug}?qty=${productQty}${
            selectedVariation?.id ? `&v=${selectedVariation?.id}` : ""
          }`}
          bgcolor="bg-purple"
          className="button min-h-12 w-full text-base sm:text-xl"
        />
        <span className="absolute -left-1 -top-1 z-0 h-3 w-3 animate-ping rounded-full bg-purple opacity-90" />
      </div>
    </>
  );

  return (
    <>
      <div className="mt-4 hidden grid-cols-2 gap-2 sm:grid">{buttons}</div>
      <MobileFixedActionBar>{buttons}</MobileFixedActionBar>
    </>
  );
}
