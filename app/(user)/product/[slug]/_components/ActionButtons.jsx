import AddToCartButton from "@/components/products/addToCartButton";
import BuyNowButton from "@/components/products/buyNowButton";

export default function ActionButtons({
  product,
  productQty,
  selectedVariation,
}) {
  return (
    <div className="grid grid-cols-2 z-50 gap-2 mt-4 fixed bottom-1 left-0 w-full sm:static">
      {/* Add to cart button  */}

      <AddToCartButton product={product} className={" w-full   text-4xl"} />

      {/* buy now button  */}
      <div className="relative ">
        <BuyNowButton
          product={product}
          selectedVariation={selectedVariation}
          slug={`${product?.slug}?qty=${productQty}`}
          bgcolor="bg-purple"
          className={
            " w-full hover:bg-orange-600 hover:border-b-orange-900 text-white  border-b-4  border-orange-800  py-2 text-4xl "
          }
        />

        <span className="animate-ping absolute -top-1 z-0 -left-1 h-3 w-3 rounded-full bg-purple opacity-90"></span>
      </div>
    </div>
  );
}
