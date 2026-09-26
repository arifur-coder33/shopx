import Link from "next/link";
import { Clock3 } from "lucide-react";
import ImageCustomServer from "@/components/images/ImageCustomServer";
import CampaignCountdown from "./CampaignCountdown";
import { getCampaignRuleText } from "@/components/campaign/campaignRuleText";
import { replaceNumbers } from "@/utils/engToBanNumber";

export function CampaignBannerCard({ campaign }) {
  const ruleText = replaceNumbers(getCampaignRuleText({
    ...campaign,
    targetProductCount: campaign._count?.products,
    targetCategoryCount: campaign._count?.categories,
  }));

  return <Link href={`/campaign/${campaign.id}`} className="group block overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-md shadow-slate-900/5 transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10">
    <div className="relative aspect-[2.45/1] overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-secondary">
      {campaign.bannerUrl
        ? <ImageCustomServer src={campaign.bannerUrl} alt={campaign.name} w={900} h={370} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        : <div className="flex h-full flex-col justify-end bg-gradient-to-br from-primary to-secondary p-4 text-white sm:p-6"><span className="mb-1 text-xs font-semibold uppercase tracking-[0.2em]">Campaign</span><strong className="line-clamp-1 text-xl font-black sm:text-3xl">{campaign.name}</strong><span className="mt-1 line-clamp-2 text-sm font-semibold">{ruleText}</span></div>}
      {campaign.bannerUrl && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/55 to-transparent px-3 pb-3 pt-8 sm:px-5 sm:pb-4 sm:pt-10"><p className="line-clamp-1 text-lg font-bold text-white drop-shadow sm:text-xl">{campaign.name}</p><p className="mt-0.5 line-clamp-2 text-xs font-semibold text-white/95 sm:text-sm">{ruleText}</p></div>}
      {campaign.couponCode && <span className="absolute right-3 top-3 rounded-full bg-surface/95 px-3 py-1 text-xs font-bold text-primary shadow">{campaign.couponCode}</span>}
    </div>
    <div className="flex min-h-12 items-center gap-2 border-t border-border/60 bg-surface px-3 py-2.5">
      <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
      <CampaignCountdown startAt={campaign.startAt} endAt={campaign.endAt} cardCompact className="text-text-muted" />
    </div>
  </Link>;
}

export default function CampaignBannerGrid({ campaigns, title = "চলমান ক্যাম্পেইন", showAllLink = false }) {
  if (!campaigns?.length) return null;
  return <section className="mt-6" aria-labelledby="campaign-banners-title">
    <div className="mb-3 flex items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-wider text-primary">বিশেষ অফার</p><h2 id="campaign-banners-title" className="text-xl font-bold sm:text-2xl">{title}</h2></div>
      {showAllLink && <Link href="/campaign" className="shrink-0 text-sm font-semibold text-primary hover:underline">সব ক্যাম্পেইন →</Link>}
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => <CampaignBannerCard key={campaign.id} campaign={campaign} />)}
    </div>
  </section>;
}




