import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/products/ProductCard";
import ImageCustomServer from "@/components/images/ImageCustomServer";
import CampaignCountdown from "../CampaignCountdown";
import { getPublicCampaignProducts } from "@/backend/services/campaignService";

export const revalidate = 60;

export default async function CampaignDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const result = await getPublicCampaignProducts(id, query?.page);
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
      {products.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="rounded-xl border border-border bg-surface p-6 text-center text-text-muted">এই ক্যাম্পেইনে এখন কোনো পণ্য নেই।</p>}
    </section>
    {totalPages > 1 && <nav aria-label="Campaign product pages" className="mt-6 flex items-center justify-center gap-4">
      {page > 1 && <Link className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-primary" href={`/campaign/${id}?page=${page - 1}`}>আগের পৃষ্ঠা</Link>}
      <span className="text-sm text-text-muted">পৃষ্ঠা {page} / {totalPages}</span>
      {page < totalPages && <Link className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-primary" href={`/campaign/${id}?page=${page + 1}`}>পরের পৃষ্ঠা</Link>}
    </nav>}
  </main>;
}

