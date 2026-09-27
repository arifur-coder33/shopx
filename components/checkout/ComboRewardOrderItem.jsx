import Image from "next/image";
import Link from "next/link";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { replaceNumbers } from "@/utils/engToBanNumber";

function variantLabel(variation) {
  const values = (variation.combinations || []).map((combo) => {
    const name = combo.variationName?.name;
    const value = combo.variationValue?.value;
    return name && value ? `${name}: ${value}` : null;
  }).filter(Boolean);
  return values.join(" / ") || variation.sku || "ভ্যারিয়েন্ট";
}

export default function ComboRewardOrderItem({ item, onVariationChange }) {
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const unitPrice = Math.max(0, Number(item.discountPrice ?? item.price) || 0);
  const originalPrice = Math.max(unitPrice, Number(item.regularPrice) || Number(item.price) || 0);
  const variants = item.variationOptions || [];
  return <article className="my-2 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary-soft/20 p-2">
    <Link href={item.slug ? `/product/${encodeURIComponent(item.slug)}` : "#"} className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface">
      <Image src={cloudinaryMainImage(item.thumbnail, 96, 96)} width={56} height={56} unoptimized alt={item.title} className="h-full w-full object-cover" />
    </Link>
    <div className="min-w-0 flex-1">
      <Link href={item.slug ? `/product/${encodeURIComponent(item.slug)}` : "#"} className="line-clamp-1 text-sm font-semibold text-text hover:text-primary">{item.title}</Link>
      <p className="text-[11px] text-text-muted">কম্বো পুরস্কার · {item.comboCampaignName}</p>
      {variants.length > 1 && <select aria-label={`${item.title} ভ্যারিয়েন্ট নির্বাচন`} value={item.variation.id} onChange={(event) => onVariationChange?.(item.id, event.target.value)} className="mt-1 max-w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-text">
        {variants.map((variation) => <option key={variation.id} value={variation.id}>{variantLabel(variation)}</option>)}
      </select>}
      <p className="flex flex-wrap items-baseline gap-1.5 text-xs"><span className="font-bold text-primary">৳{replaceNumbers(unitPrice.toLocaleString("en-US"))}</span>{originalPrice > unitPrice && <span className="text-[11px] text-text-muted line-through">৳{replaceNumbers(originalPrice.toLocaleString("en-US"))}</span>}<span className="text-text-muted">× {replaceNumbers(String(quantity))}</span></p>
    </div>
    <strong className="shrink-0 text-sm text-text">৳{replaceNumbers((unitPrice * quantity).toLocaleString("en-US"))}</strong>
  </article>;
}
