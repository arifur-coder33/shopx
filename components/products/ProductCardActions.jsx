"use client";

import { getStorefrontCartItem } from "@/backend/serverActions/storefrontCartAction";
import { useCart } from "@/context/CartContext";
import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { useSiteAppearance } from "@/components/common/Providers";
import { useSession } from "next-auth/react";
import { LoaderCircle, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";

export default function ProductCardActions({ slug, checkoutTracking }) {
  const appearance = useSiteAppearance() || {};
  const { addToCart } = useCart();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const cartLabel = appearance.cartButtonLabel || "Add to Cart";
  const buyLabel = appearance.buyNowButtonLabel || "Buy Now";

  const handleAddToCart = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await getStorefrontCartItem(slug);
      if (!result?.success || !result.data) {
        throw new Error(result?.error || "Product is unavailable.");
      }

      const product = result.data;
      addToCart(product, 1);
      trackEvent({
        event: EVENTS.ADD_TO_CART,
        value: product.discountPrice || product.regularPrice,
        src: `/product/${slug}`,
        items: [{
          id: product.sku,
          quantity: 1,
          price: product.discountPrice || product.regularPrice,
          productName: product.title,
          category: product.category?.name || "Uncategorized",
        }],
        user: { email: session?.user?.email, phone: session?.user?.phone },
      });
      toast.success("পণ্যটি ব্যাগে যোগ হয়েছে");
    } catch (error) {
      toast.error(error?.message || "পণ্যটি এখন ব্যাগে যোগ করা যাচ্ছে না");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-auto grid grid-cols-2 gap-1.5">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={loading}
        aria-busy={loading}
        aria-label={cartLabel}
        title={cartLabel}
        className="relative flex min-h-11 min-w-0 items-center justify-center truncate rounded-brand px-1.5 py-2 text-center text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 sm:px-2 sm:text-sm"
        style={{ backgroundColor: appearance.cartButtonColor || "#ea580c" }}
      >
        {loading ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <span className="relative"><ShoppingCart className="h-5 w-5" aria-hidden="true" /><Plus className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-white text-primary" strokeWidth={3} aria-hidden="true" /></span>}
      </button>
      <Link
        className="flex min-h-11 min-w-0 items-center justify-center truncate rounded-brand px-1.5 py-2 text-center text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:px-2 sm:text-sm"
        href={`/buynow/${encodeURIComponent(slug)}`}
        data-checkout-product={checkoutTracking}
        style={{ backgroundColor: appearance.buyNowButtonColor || "#0f766e" }}
      >
        {buyLabel}
      </Link>
    </div>
  );
}
