"use client";

import { getStorefrontCartItem } from "@/backend/serverActions/storefrontCartAction";
import { useCart } from "@/context/CartContext";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import {
  readWishlist,
  WISHLIST_CHANGE_EVENT,
  WISHLIST_STORAGE_KEY,
} from "@/utils/wishlist";
import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import WishlistButton from "./WishlistButton";

export default function WishlistPageClient() {
  const [items, setItems] = useState([]);
  const [addingSlug, setAddingSlug] = useState(null);
  const { addToCart } = useCart();

  const handleAddToCart = async (product) => {
    if (product.hasVariations) return;

    setAddingSlug(product.slug);
    try {
      // Fetch full stock/variation data only after the click, keeping wishlist load fast.
      const result = await getStorefrontCartItem(product.slug);
      if (result?.requiresSelection) {
        window.location.assign(`/product/${encodeURIComponent(product.slug)}`);
        return;
      }
      if (!result?.success || !result.data) {
        throw new Error("Product is unavailable");
      }

      addToCart(result.data, 1);

      const { toast } = await import("react-toastify");
      toast.success("পণ্যটি ব্যাগে যোগ হয়েছে");
    } catch {
      const { toast } = await import("react-toastify");
      toast.error("পণ্যটি এখন ব্যাগে যোগ করা যাচ্ছে না");
    } finally {
      setAddingSlug(null);
    }
  };

  useEffect(() => {
    setItems(readWishlist());
    const handleChange = (event) => setItems(event.detail?.items || []);
    const handleStorage = (event) => {
      if (event.key === WISHLIST_STORAGE_KEY) setItems(readWishlist());
    };
    window.addEventListener(WISHLIST_CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(WISHLIST_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // These cards appear after localStorage is read; sync after hydration so
  // React's server markup is never changed before it is attached.
  useEffect(() => {
    if (!items.length) return;
    window.dispatchEvent(
      new CustomEvent(WISHLIST_CHANGE_EVENT, { detail: { items } }),
    );
  }, [items]);

  if (!items.length) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
        <Heart className="mb-3 h-12 w-12 text-text-muted" />
        <h1 className="text-2xl font-bold">পছন্দের তালিকা খালি</h1>
        <p className="mt-1 text-text-muted">পণ্যের heart icon চাপলে এখানে জমা থাকবে।</p>
        <Link href="/" className="button mt-5">পণ্য দেখুন</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">পছন্দের তালিকা ({items.length})</h1>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((product) => (
          <article key={product.slug || product.id} className="product-card relative flex min-w-0 flex-col">
            <WishlistButton product={{ ...product, mainImage: product.image }} className="absolute right-2 top-2 z-10" />
            <Link href={`/product/${encodeURIComponent(product.slug)}`}>
              <div className="relative aspect-square w-full">
                <Image
                  src={product.image ? cloudinaryMainImage(product.image, 300, 300) : "/images/default.png"}
                  alt={product.title}
                  fill
                  sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 20vw"
                  className="rounded-md object-cover"
                  unoptimized
                />
              </div>
              <h2 className="line-clamp-2 min-h-12 py-2 text-base leading-6">{product.title}</h2>
              <p className="text-lg font-bold text-brand">
                {product.discountPrice || product.regularPrice}-/
              </p>
            </Link>
            {product.hasVariations ? (
              <Link
                href={`/product/${encodeURIComponent(product.slug)}`}
                className="mt-2 block min-h-11 rounded-brand bg-brand px-2 py-2 text-center font-semibold"
              >
                Select Options
              </Link>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={addingSlug === product.slug}
                  onClick={() => handleAddToCart(product)}
                  className="min-h-11 rounded-brand border border-primary px-1.5 py-2 text-sm font-semibold text-primary disabled:opacity-60"
                >
                  {addingSlug === product.slug ? "যোগ হচ্ছে…" : "ব্যাগে রাখুন"}
                </button>
                <Link
                  href={`/buynow/${encodeURIComponent(product.slug)}`}
                  className="min-h-11 rounded-brand bg-brand px-1.5 py-2 text-center text-sm font-semibold"
                >
                  Buy Now
                </Link>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
