"use client";
import { trackFacebookEvent } from "@/utils/fbEventTrack";
import { errorSoundWithVibrate } from "@/utils/sounds";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "react-toastify";
import Button from "../button";
import KalapanaFont from "../KalapanaFont";
const Tooltip = dynamic(() => import("@/components/common/Tooltip"), {
  ssr: false,
});
export default function BuyNowButton({
  product,
  slug,
  selectedVariation,
  ...restProps
}) {
  // --- TOP PRIORITY RULE ---
  // If no 'slug' prop is provided, we are on a product grid/list.
  // The button's only purpose is to link to the product detail page.

  // --- LOGIC FOR WHEN SLUG IS PROVIDED (on product detail page) ---

  // Helper Constants for clarity
  const hasVariations = product?.variations?.length > 0;
  const isVariationSelected = !!selectedVariation;

  // Determine the button's state based on priority
  let isDisabled = false;
  let tooltipContent = "";

  // Priority 1: A selected variation is out of stock.
  if (isVariationSelected && selectedVariation.stock <= 0) {
    isDisabled = true;
    tooltipContent = "This variation is out of stock";
  }
  // Priority 2: A simple product (no variations) is out of stock.
  else if (!hasVariations && product?.stock <= 0) {
    isDisabled = true;
    tooltipContent = "Stock Out";
  }

  // Event Handlers
  const handleProceedToCheckout = () => {
    const price =
      selectedVariation?.discountPrice ||
      product.discountPrice ||
      product?.regularPrice;
    trackFacebookEvent("InitiateCheckout", {
      content_type: "product",
      content_id: product.id,
      value: price,
      currency: "BDT",
    });
  };

  const handleVariationWarning = () => {
    toast.error("Please select a variation before proceeding.");
    errorSoundWithVibrate();
  };

  if (!slug && !hasVariations) {
    return (
      <Link href={`/buynow/${product?.slug}`} passHref className="w-full">
        <Button
          className={"w-full bg-cyan-500 border-b-4 border-b-cyan-700 p-2"}
          {...restProps}
        >
          <KalapanaFont>এখনি কিনুন</KalapanaFont>
        </Button>
      </Link>
    );
  }

  if (!slug && hasVariations) {
    return (
      <Link href={`/product/${product?.slug}`} passHref className="w-full">
        <Button
          className={"w-full bg-cyan-500 border-b-4 border-b-cyan-700 p-2"}
          {...restProps}
        >
          <KalapanaFont>এখনি কিনুন</KalapanaFont>
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
          <KalapanaFont>এখনি কিনুন</KalapanaFont>
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
          className={"w-full bg-cyan-500 border-b-4 border-b-cyan-700 p-2"}
          {...restProps}
        >
          <KalapanaFont>এখনি কিনুন</KalapanaFont>
        </Button>
      </Tooltip>
    );
  }

  // CASE C: All checks passed. The button is active and links to the buy now page.
  return (
    <Link href={`/buynow/${slug}`} passHref className="w-full">
      <Button
        onClick={handleProceedToCheckout}
        className={"w-full bg-cyan-500 border-b-4 border-b-cyan-700 p-2"}
        {...restProps}
      >
        <KalapanaFont>এখনি কিনুন</KalapanaFont>
      </Button>
    </Link>
  );
}
