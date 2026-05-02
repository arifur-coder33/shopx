"use client";
import { useCart } from "@/context/CartContext";
import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { useSession } from "next-auth/react";
import Button from "../button";
import KalapanaFont from "../KalapanaFont";
export default function AddToCartButton(props) {
  const { data: session } = useSession();
  const { addToCart } = useCart();
  const { product, selectedVariation, productQty } = props;
  const { hasVariations, variations, title, weight, category, slug } = product;

  const getDiscountPrice = selectedVariation
    ? selectedVariation?.discountPrice || selectedVariation?.regularPrice
    : !variations?.combinations?.length > 0 &&
      (variations[0]?.discountPrice || variations[0]?.regularPrice);

  const getRegularPrice = selectedVariation
    ? selectedVariation?.regularPrice
    : !variations?.combinations?.length > 0 && variations[0]?.regularPrice;

  const getSku = selectedVariation
    ? selectedVariation?.sku
    : !variations?.combinations?.length > 0 && variations[0]?.sku;
  const getWeight = selectedVariation
    ? selectedVariation?.weight
    : !variations?.combinations?.length > 0 && variations[0]?.weight;

  const handleAddToCart = () => {
    const productData = {
      title: title,
      discountPrice: getDiscountPrice,
      regularPrice: getRegularPrice,
      variation:
        variations[0]?.combinations?.length > 0 && selectedVariation
          ? {
              id: selectedVariation?.id,
              combinations: selectedVariation?.combinations,
            }
          : {
              id: variations[0]?.id,
              combinations: [],
            },

      thumbnail: selectedVariation
        ? selectedVariation?.thumbnail?.name
        : product?.thumbnail?.name || product?.mainImage,
      slug: product?.slug,
      id: product?.id,
      weight: getWeight,
      sku: getSku,
      category: category || "Uncategorized",
    };
    console.log("productcart Data", productData);

    if (
      hasVariations &&
      variations[0]?.combinations?.length > 0 &&
      !selectedVariation
    ) {
      import("react-toastify").then((module) => {
        const { toast } = module;
        toast.warn("দয়া করে ভ্যারিয়েশন সিলেক্ট করুন");
      });

      import("@/utils/sounds").then((module) => {
        const { errorSoundWithVibrate } = module;
        errorSoundWithVibrate();
      });
      import("@/utils/uiUtils").then((module) => {
        const { scrollToAndHighlight } = module;
        scrollToAndHighlight("#product-variation-list");
      });
      return;
    }
    addToCart(productData, productQty);

    trackEvent({
      event: EVENTS.ADD_TO_CART,
      value: productData.discountPrice || productData?.regularPrice,
      src: `/product/${slug}`,
      items: [
        {
          id: productData?.sku,
          quantity: productQty || 1,
          price: productData.discountPrice || productData?.regularPrice,
          productName: productData?.title,

          category: productData.category?.name || "Uncategorized",
        },
      ],
      user: {
        email: session?.user?.email,
        phone: session?.user?.phone,
      },
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
