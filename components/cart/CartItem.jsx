import { replaceNumbers } from "@/utils/engToBanNumber";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import Imagecustom from "../images/ImageCustom";
import RemoveCartItem from "./RemoveCartItem";

const money = (value) =>
  replaceNumbers(Number(value || 0).toLocaleString("en-US"));

export default function CartItem({
  title,
  thumbnail,
  slug,
  discountPrice,
  regularPrice,
  setProductQy,
  productQty = 1,
  removeItem,
  variation = null,
  id,
}) {
  const product = { id, variation };
  const unitPrice = Number(discountPrice || regularPrice || 0);
  const hasDiscount =
    Number(discountPrice) > 0 && Number(discountPrice) < Number(regularPrice);

  return (
    <article className="relative rounded-2xl border border-border bg-surface p-3 shadow-sm">
      <div className="flex gap-3">
        <Link
          href={`/product/${slug}`}
          className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-muted sm:h-24 sm:w-24"
        >
          <Imagecustom
            src={thumbnail}
            alt={title}
            w={96}
            h={96}
            objectFit="cover"
            sizes="96px"
            imageClassName="h-full w-full object-cover"
            priority={false}
            quality={70}
          />
        </Link>

        <div className="min-w-0 flex-1 pr-8">
          <Link href={`/product/${slug}`}>
            <h3 className="line-clamp-2 text-sm font-bold leading-5 text-text hover:text-primary sm:text-base">
              {title}
            </h3>
          </Link>

          {variation?.combinations?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {variation.combinations.map((item, index) => (
                <span
                  key={`${item?.variationName?.name}-${index}`}
                  className="rounded-full bg-surface-muted px-2 py-1 text-[10px] text-text-muted"
                >
                  {item?.variationName?.name}: {item?.variationValue?.value}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <strong className="text-base text-primary">৳{money(unitPrice)}</strong>
            {hasDiscount && (
              <span className="text-xs text-text-muted line-through">
                ৳{money(regularPrice)}
              </span>
            )}
          </div>
        </div>

        {!removeItem && (
          <RemoveCartItem productId={product} productName={title} />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div
          className="flex items-center rounded-xl border border-border bg-surface-muted p-1"
          aria-label={`${title} quantity`}
        >
          <button
            type="button"
            aria-label="পরিমাণ কমান"
            disabled={productQty <= 1}
            onClick={() => setProductQy(productQty - 1, "decrement")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-9 text-center text-sm font-bold text-text">
            {replaceNumbers(String(productQty))}
          </span>
          <button
            type="button"
            aria-label="পরিমাণ বাড়ান"
            disabled={productQty >= 10}
            onClick={() => setProductQy(productQty + 1, "increment")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="text-right">
          <span className="block text-[11px] text-text-muted">মোট মূল্য</span>
          <strong className="text-base text-text">৳{money(unitPrice * productQty)}</strong>
        </div>
      </div>
    </article>
  );
}
