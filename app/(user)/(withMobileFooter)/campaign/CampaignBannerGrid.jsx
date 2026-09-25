import Link from "next/link";
import ImageCustomServer from "@/components/images/ImageCustomServer";
import CampaignCountdown from "./CampaignCountdown";

export function CampaignBannerCard({ campaign }) {
  return <Link href={`/campaign/${campaign.id}`} className="group block overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-brand">
    <div className="relative aspect-[2.45/1] overflow-hidden bg-gradient-to-br from-primary to-secondary">
      {campaign.bannerUrl ? <ImageCustomServer src={campaign.bannerUrl} alt={campaign.name} w={900} h={370} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /> : <div className="flex h-full flex-col justify-between p-4 text-white sm:p-6"><span className="text-xs font-semibold uppercase tracking-[0.2em]">Campaign</span><strong className="line-clamp-2 text-xl font-black sm:text-3xl">{campaign.name}</strong></div>}
      {campaign.bannerUrl && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10 sm:px-5 sm:pb-4"><p className="line-clamp-1 text-lg font-bold text-white drop-shadow sm:text-xl">{campaign.name}</p></div>}
      {campaign.couponCode && <span className="absolute right-3 top-3 rounded-full bg-surface/95 px-3 py-1 text-xs font-bold text-primary shadow">{campaign.couponCode}</span>}
    </div>
    <div className="space-y-2 p-3 sm:p-4">
      <CampaignCountdown startAt={campaign.startAt} endAt={campaign.endAt} className="" />
      <div className="flex items-center justify-between gap-3">
      <p className="line-clamp-2 min-w-0 text-sm text-text-muted">{campaign.description || "অফারের পণ্যগুলো দেখতে ক্লিক করুন।"}</p>
      <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">পণ্য দেখুন →</span>
      </div>
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




