"use client";
import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Button from "../button";
import Tooltip from "../common/Tooltip";
import KalapanaFont from "../KalapanaFont";
import { useSiteAppearance } from "@/components/common/Providers";
export default function BuyNowButton({
  children = "এখনি কিনুন",
  product,
  slug,
  selectedVariation,
  ...restProps
}) {
  const appearance = useSiteAppearance() || {};
  const buttonLabel = appearance.buyNowButtonLabel || "Buy Now";
  const buttonColor = appearance.buyNowButtonColor || "#0f766e";
  const { data: session } = useSession();
  const hasVariations = product?.variations[0]?.combinations?.length > 0;
  const isVariationSelected = !!selectedVariation;
  const getSku = selectedVariation
    ? selectedVariation?.sku
    : !product?.variations?.combinations?.length > 0 &&
      product?.variations[0]?.sku;
  // Determine the button's state based on priority
  let isDisabled = false;
  let tooltipContent = "";

  // Priority 1: A selected variation is out of stock.
  if (!product?.stockPending && !product?.allowOutOfStockOrder && isVariationSelected && selectedVariation.stock <= 0) {
    isDisabled = true;
    tooltipContent = "This variation is out of stock";
  }
  // Priority 2: A simple product (no variations) is out of stock.
  else if (!product?.stockPending && !product?.allowOutOfStockOrder && !hasVariations && product?.stock <= 0) {
    isDisabled = true;
    tooltipContent = "Stock Out";
  }
  else if (!product?.stockPending && !product?.allowOutOfStockOrder && hasVariations && product.variations.every((variation) => variation.stock <= 0)) {
    isDisabled = true;
    tooltipContent = "Stock Out";
  }

  // Event Handlers
  const handleProceedToCheckout = () => {
    console.log("product buy", product);
    const price =
      selectedVariation?.discountPrice ||
      selectedVariation?.regularPrice ||
      product?.variations[0]?.discountPrice ||
      product?.variations[0]?.regularPrice;

    trackEvent({
      event: EVENTS.CHECKOUT,
      value: price,
      items: [
        {
          id: getSku,
          quantity: 1,
          price: price,
          productName: product?.title,
          category: product.category?.name || "Uncategorized",
        },
      ],
      user: {
        email: session?.user?.email,
        phone: session?.user?.phone,
      },
    });
  };

  const handleVariationWarning = () => {
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
  };

  if (!slug && !hasVariations) {
    return (
      <Link href={`/buynow/${product?.slug}`} passHref className="w-full">
        <Button
          className="w-full border-b-4 p-2"
          style={{ backgroundColor: buttonColor }}
          {...restProps}
        >
          <KalapanaFont>{buttonLabel}</KalapanaFont>
        </Button>
      </Link>
    );
  }

  if (!slug && hasVariations) {
    return (
      <Link href={`/product/${product?.slug}`} passHref className="w-full">
        <Button
          className="w-full border-b-4 p-2"
          style={{ backgroundColor: buttonColor }}
          {...restProps}
        >
          <KalapanaFont>{buttonLabel}</KalapanaFont>
        </Button>
      </Link>
    );
  }
  // --- RENDER LOGIC (for when slug exists) ---

  // CASE A: The button must be DISABLED (due to stock).
  if (isDisabled) {
    return (
      <Tooltip content={tooltipContent}>
        <Button
          disabled
          className={
            "w-full bg-gray-400 border-b-4 border-b-gray-600 p-2 cursor-not-allowed"
          }
          {...restProps}
        >
          <KalapanaFont>{buttonLabel}</KalapanaFont>
        </Button>
      </Tooltip>
    );
  }

  // CASE B: A variation needs to be selected. The button is CLICKABLE but warns the user.
  if (hasVariations && !isVariationSelected) {
    return (
      <Tooltip content="Please select a variation">
        <Button
          onClick={handleVariationWarning}
          className="w-full border-b-4 p-2"
          style={{ backgroundColor: buttonColor }}
          {...restProps}
        >
          <KalapanaFont>{buttonLabel}</KalapanaFont>
        </Button>
      </Tooltip>
    );
  }

  // CASE C: All checks passed. The button is active and links to the buy now page.
  return (
    <Link href={`/buynow/${slug}`} passHref className="w-full">
      <Button
        onClick={handleProceedToCheckout}
        className="w-full border-b-4 p-2"
        style={{ backgroundColor: buttonColor }}
        {...restProps}
      >
        <KalapanaFont>{buttonLabel}</KalapanaFont>
      </Button>
    </Link>
  );
}
