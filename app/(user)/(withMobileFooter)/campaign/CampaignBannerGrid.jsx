import Link from "next/link";
import { Clock3 } from "lucide-react";
import ImageCustomServer from "@/components/images/ImageCustomServer";
import CampaignCountdown from "./CampaignCountdown";
import { getCampaignRuleText } from "@/components/campaign/campaignRuleText";
import { replaceNumbers } from "@/utils/engToBanNumber";

export function CampaignBannerCard({ campaign, single = false, compact = false }) {
  const currentTime = Date.now();
  const isLive = (!campaign.startAt || new Date(campaign.startAt).getTime() <= currentTime) &&
    (!campaign.endAt || new Date(campaign.endAt).getTime() >= currentTime);
  const ruleText = replaceNumbers(getCampaignRuleText({
    ...campaign,
    targetProductCount: campaign._count?.products,
    targetCategoryCount: campaign._count?.categories,
  }));
  const productPhotos = Array.from(new Map([
    ...(campaign.products || []).map(({ product }) => product),
    ...(campaign.categories || []).flatMap(({ category }) => category?.products || []),
  ].map((product) => ({ ...product, photo: product?.thumbnail?.name || product?.gallery?.[0]?.media?.name || product?.variations?.[0]?.thumbnail?.name }))
    .filter((product) => product?.photo).map((product) => [product.id, product])).values()).slice(0, 3);

  return <Link href={`/campaign/${campaign.id}`} className="campaign-live-card group block overflow-hidden rounded-[1.35rem] border border-white/70 bg-surface shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/15">
    <div className={`campaign-live-art relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-secondary ${campaign.bannerUrl ? `campaign-has-banner aspect-[2.4/1] sm:aspect-[2.6/1]` : (single ? "h-[84px] sm:h-[220px]" : "aspect-[2.4/1] sm:aspect-[2.6/1]")}`}>
      {isLive && <span className="campaign-live-indicator absolute left-2.5 top-2.5 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-green-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg sm:left-4 sm:top-4 sm:text-xs"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-200 opacity-80" /><span className="relative inline-flex h-2 w-2 rounded-full bg-white" /></span>LIVE</span>}
      {campaign.bannerUrl
        ? <ImageCustomServer src={campaign.bannerUrl} alt={campaign.name} w={640} h={460} sizes={single ? "100vw" : "50vw"} className={`h-full w-full ${compact ? "bg-surface object-contain" : "object-cover transition duration-500 group-hover:scale-[1.02]"}`} />
        : <div className="relative flex h-full flex-col justify-center overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary px-3 py-2 text-white sm:px-6 sm:py-4">
          <span aria-hidden="true" className="campaign-burst absolute inset-0" />
          <strong className={`relative z-[1] line-clamp-2 text-xl font-black leading-tight tracking-tight drop-shadow-[0_2px_0_rgba(0,0,0,.35)] sm:text-4xl ${productPhotos.length ? "max-w-[62%] sm:max-w-[72%]" : "max-w-[82%]"}`}>{campaign.name}</strong>
          <span className={`relative z-[1] mt-2 inline-flex w-fit line-clamp-2 rounded-xl bg-white px-2.5 py-1.5 text-sm font-black leading-tight text-primary shadow-lg ring-1 ring-white/60 sm:mt-3 sm:px-5 sm:py-2.5 sm:text-2xl ${productPhotos.length ? "max-w-[62%] sm:max-w-[72%]" : "max-w-[88%]"}`}>{ruleText}</span>
        </div>}
      {!campaign.bannerUrl && <>
        <span aria-hidden="true" className="campaign-balloon campaign-balloon-one" />
        <span aria-hidden="true" className="campaign-balloon campaign-balloon-two" />
        <span aria-hidden="true" className="campaign-bubble campaign-bubble-one" />
        <span aria-hidden="true" className="campaign-bubble campaign-bubble-two" />
      </>}
      {!campaign.bannerUrl && productPhotos.length > 0 && <span className="absolute right-2 top-1/2 z-20 inline-flex -translate-y-1/2 items-center -space-x-2 rounded-full border border-white/50 bg-surface/90 p-1 shadow-lg backdrop-blur-sm sm:right-4 sm:-space-x-2.5 sm:p-1.5">
        {productPhotos.map((product) => <ImageCustomServer key={product.id} src={product.photo} alt={product.title} w={72} h={72} sizes="(max-width: 640px) 32px, 40px" className="h-8 w-8 rounded-full border-2 border-surface bg-surface object-cover sm:h-10 sm:w-10" />)}
      </span>}
      {!campaign.bannerUrl && campaign.couponCode && <span className="absolute right-3 top-3 z-10 rounded-full bg-surface/95 px-3 py-1 text-xs font-bold text-primary shadow">{campaign.couponCode}</span>}
    </div>
    <div className="flex min-h-9 items-center gap-1.5 border-t border-border/60 bg-gradient-to-r from-surface via-primary-soft/20 to-surface px-2.5 py-1 sm:min-h-11 sm:gap-2 sm:px-3 sm:py-2">
      <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
      <CampaignCountdown startAt={campaign.startAt} endAt={campaign.endAt} cardCompact className="text-text-muted" />
    </div>
  </Link>;
}

export default function CampaignBannerGrid({ campaigns, title = "চলমান ক্যাম্পেইন", showAllLink = false, compact = false }) {
  if (!campaigns?.length) return null;
  return <section className={compact ? "mt-4 w-full" : "mt-6"} aria-label={compact ? "ক্যাম্পেইন" : title}>
    {!compact && <div className="mb-3 flex items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-wider text-primary">বিশেষ অফার</p><h2 className="text-xl font-bold sm:text-2xl">{title}</h2></div>
      {showAllLink && <Link href="/campaign" className="shrink-0 text-sm font-semibold text-primary hover:underline">সব ক্যাম্পেইন →</Link>}
    </div>}
    <div className={campaigns.length === 1 ? "grid w-full grid-cols-1 gap-2 sm:gap-3" : compact ? "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4" : "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3"}>
      {campaigns.map((campaign) => <CampaignBannerCard key={campaign.id} campaign={campaign} single={campaigns.length === 1} compact={compact} />)}
    </div>
    {compact && showAllLink && <div className="mt-3 flex justify-center">
      <Link href="/campaign" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary-soft/70 px-5 text-sm font-bold text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-white">
        সব ক্যাম্পেইন দেখুন <span aria-hidden="true">→</span>
      </Link>
    </div>}
  </section>;
}




