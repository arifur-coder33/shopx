import CampaignCountdown from "@/app/(user)/(withMobileFooter)/campaign/CampaignCountdown";
import ImageCustomServer from "@/components/images/ImageCustomServer";
import Link from "next/link";
import { getComboOfferText } from "@/components/campaign/comboOfferText";
import { replaceNumbers } from "@/utils/engToBanNumber";

function discountLabel(campaign) {
  const amount = replaceNumbers(String(campaign.discountValue || 0));
  if (campaign.type === "PRODUCT_DISCOUNT") {
    return campaign.discountType === "PERCENT" ? "পণ্যে " + amount + "% ছাড়" : "পণ্যে ৳" + amount + " ছাড়";
  }
  if (campaign.type === "CART_DISCOUNT" || campaign.type === "COUPON") {
    return campaign.discountType === "PERCENT" ? "অর্ডারে " + amount + "% ছাড়" : "অর্ডারে ৳" + amount + " ছাড়";
  }
  if (campaign.type === "PAYMENT_DISCOUNT") {
    const scope = campaign.configuration?.paymentScope;
    const methodText = scope === "COD" ? "COD পেমেন্টে" : scope === "ONLINE" ? "অনলাইন পেমেন্টে" : "নির্বাচিত পেমেন্টে";
    const targetText = campaign.configuration?.paymentDiscountTarget === "DELIVERY" ? "ডেলিভারি চার্জে " : "";
    return methodText + " " + targetText + (campaign.discountType === "PERCENT" ? amount + "%" : "৳" + amount) + " ছাড়";
  }
  if (["DELIVERY", "DELIVERY_DISCOUNT"].includes(campaign.type)) {
    const free = campaign.configuration?.offerType === "FREE" ||
      (campaign.discountType === "PERCENT" && Number(campaign.discountValue) >= 100);
    return free ? "ফ্রি ডেলিভারি" : "ডেলিভারি চার্জে " + (campaign.discountType === "PERCENT" ? amount + "%" : "৳" + amount) + " ছাড়";
  }
  if (campaign.type === "COMBO" || campaign.group === "COMBO") return "কম্বো অফার";
  return "বিশেষ অফার";
}

export function CampaignOfferList({ campaigns = [], title = "চলমান অফার", checkout = false }) {
  if (!campaigns.length) return null;
  return <section className="mt-4 space-y-2" aria-label={title}>
    <h2 className="text-base font-bold">{title}</h2>
    {checkout && <p className="text-xs text-text-muted">আপনার অর্ডারের শর্ত পূরণ হলে campaign discount স্বয়ংক্রিয়ভাবে হিসাব হবে।</p>}
    <div className="space-y-2">
      {campaigns.map((campaign) => <article key={campaign.id} className="rounded-xl border border-border bg-surface p-3">
        <div className="min-w-0">
          <p className="font-semibold">{campaign.name}</p>
          <p className="mt-0.5 text-sm font-semibold text-primary">{discountLabel(campaign)}</p>
          {campaign.couponCode && <p className="mt-1 text-xs font-semibold text-text-muted">কুপন কোড: <span className="text-primary">{campaign.couponCode}</span></p>}
          {campaign.description && <p className="mt-1 text-xs text-text-muted">{campaign.description}</p>}
          {campaign.minimumOrderAmount > 0 && <p className="mt-1 text-xs text-text-muted">ন্যূনতম অর্ডার ৳{replaceNumbers(String(campaign.minimumOrderAmount))}</p>}
          {campaign.type === "PAYMENT_DISCOUNT" && campaign.configuration?.paymentScope === "ONLINE" && campaign.paymentMethods?.length > 0 && <p className="mt-1 text-xs text-text-muted">নির্বাচিত অনলাইন payment method-এ প্রযোজ্য</p>}
          {(campaign.type === "COMBO" || campaign.group === "COMBO") && (campaign.configuration?.productPairs || []).map((pair, index) => <div key={`${campaign.id}-${index}`} className="mt-3 space-y-2 rounded-lg bg-surface-muted/60 p-2">
            <p className="text-xs text-text-primary">{getComboOfferText(campaign, pair)}</p>
            <div className="flex flex-wrap gap-2">{(pair.rewardProducts || []).map((reward) => <Link key={reward.id} href={reward.slug ? `/product/${encodeURIComponent(reward.slug)}` : "#"} className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-surface p-1.5 transition-colors hover:border-primary">
              <ImageCustomServer src={reward.thumbnail} alt={reward.name} w={64} h={64} className="h-12 w-12 shrink-0 rounded-md object-cover" sizes="48px" />
              <span className="min-w-0"><span className="block line-clamp-1 text-xs font-medium">{reward.name}</span><span className="block text-xs font-bold text-primary">{reward.price == null ? "দাম পাওয়া যায়নি" : `৳${replaceNumbers(String(reward.price))}`}{reward.regularPrice > reward.price && <del className="ml-1 font-normal text-text-muted">৳{replaceNumbers(String(reward.regularPrice))}</del>}</span></span>
            </Link>)}</div>
          </div>)}
        </div>
        <CampaignCountdown compact showCompactLabel startAt={campaign.startAt} endAt={campaign.endAt} className="mt-1 text-xs" />
      </article>)}
    </div>
  </section>;
}
