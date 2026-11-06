import Link from "next/link";
import { notFound } from "next/navigation";
import ImageCustomServer from "@/components/images/ImageCustomServer";
import CampaignCountdown from "../CampaignCountdown";
import { getPublicCampaignProducts } from "@/backend/services/campaignService";
import CampaignProductsGrid from "./CampaignProductsGrid";

export const dynamic = "force-static";
export const dynamicParams = true;
import { registerCampaignSchedule } from "@/backend/services/storefrontScheduleService";

export const revalidate = false;

export async function generateStaticParams() {
  // Campaigns live in the production database, which may not be reachable
  // during Vercel's build. Leave this dynamic route for on-demand ISR.
  return [];
}

export default async function CampaignDetailPage({ params }) {
  await registerCampaignSchedule();
  const { id } = await params;
  const result = await getPublicCampaignProducts(id, 1);
  if (!result) notFound();
  const { campaign, products, total, page, totalPages } = result;

  return <main className="mx-auto max-w-7xl px-3 py-5 sm:px-5 sm:py-8">
    <Link href="/campaign" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">← সব ক্যাম্পেইন</Link>
    <header className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      {campaign.bannerUrl ? <div className="relative aspect-[2.6/1] max-h-[420px] w-full bg-surface-muted"><ImageCustomServer src={campaign.bannerUrl} alt={campaign.name} w={1280} h={500} sizes="100vw" className="h-full w-full object-cover" /></div> : <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white sm:p-10"><p className="text-sm font-bold uppercase tracking-wider">Campaign offer</p></div>}
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-6">
        <div><h1 className="text-2xl font-black sm:text-3xl">{campaign.name}</h1>{campaign.description && <p className="mt-2 max-w-3xl text-sm text-text-muted">{campaign.description}</p>}<CampaignCountdown startAt={campaign.startAt} endAt={campaign.endAt} className="mt-3" /></div>
        {campaign.couponCode && <span className="rounded-lg border border-primary bg-primary-soft px-3 py-2 font-mono font-bold text-primary">{campaign.couponCode}</span>}
      </div>
    </header>
    <section aria-labelledby="campaign-products-title">
      <div className="mb-3 flex items-end justify-between gap-3"><h2 id="campaign-products-title" className="text-xl font-bold sm:text-2xl">এই ক্যাম্পেইনের পণ্য</h2><span className="text-sm text-text-muted">{total}টি পণ্য</span></div>
      {products.length ? <CampaignProductsGrid campaignId={id} initialProducts={products} total={total} totalPages={totalPages} /> : <p className="rounded-xl border border-border bg-surface p-6 text-center text-text-muted">এই ক্যাম্পেইনে এখন কোনো পণ্য নেই।</p>}
    </section>
  </main>;
}

