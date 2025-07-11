"use client";
import { useCart } from "@/context/CartContext";
import { trackFacebookEvent } from "@/utils/fbEventTrack";
import { errorSoundWithVibrate } from "@/utils/sounds";
import { toast } from "react-toastify";
import Button from "../button";
import KalapanaFont from "../KalapanaFont";
export default function AddToCartButton(props) {
  const { addToCart } = useCart();
  const { product, selectedVariation, productQty } = props;

  const handleAddToCart = () => {
    const productData = {
      title: product?.title,
      discountPrice: selectedVariation
        ? selectedVariation?.discountPrice || selectedVariation?.regularPrice
        : product?.discountPrice || product?.regularPrice,
      regularPrice: selectedVariation
        ? selectedVariation?.regularPrice
        : product?.regularPrice,
      variation: selectedVariation
        ? {
            id: selectedVariation?.id,
            combinations: selectedVariation?.combinations,
          }
        : null,

      mainImageUrl: selectedVariation
        ? selectedVariation?.thumbnail?.name
        : product?.thumbnail?.name || product?.mainImage,
      slug: product?.slug,
      id: product?.id,
      weight: selectedVariation ? selectedVariation?.weight : product?.weight,
    };
    if (product?.variations?.length > 0 && !selectedVariation) {
      toast.warn("দয়া করে ভ্যারিয়েশন সিলেক্ট করুন");
      errorSoundWithVibrate();
      return;
    }
    addToCart(productData, productQty);
    trackFacebookEvent("AddToCart", {
      content_type: "product",
      content_id: product.id,
      value: product.discountPrice || product?.regularPrice,
      currency: "BDT",
    });
  };
  return (
    <Button
      className={`bg-emerald-400 border-b-4 border-b-emerald-700 px-2`}
      onClick={handleAddToCart}
      {...props}
    >
      <KalapanaFont>ব্যাগে রাখুন</KalapanaFont>{" "}
    </Button>
  );
}
