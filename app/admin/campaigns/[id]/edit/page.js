import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/backend/utils/hasPermission";
import CampaignForm from "../../components/CampaignForm";
import { getCampaignEditorOptions } from "../../campaignPageData";
import { isDatabaseId } from "@/lib/databaseId";

export const dynamic = "force-dynamic";

export default async function EditCampaignPage({ params }) {
  await hasPermission("campaign", "update");
  const { id } = await params;
  if (!isDatabaseId(id)) notFound();
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      products: { include: { product: { select: { id: true, title: true, thumbnail: { select: { name: true } }, variations: { select: { regularPrice: true, discountPrice: true } } } } } },
      categories: { include: { category: { select: { id: true, name: true, parentCategory: { select: { name: true } } } } } },
    },
  });
  if (!campaign) notFound();
  const productIds = [...new Set([...campaign.products.map((item) => item.productId), ...(campaign.configuration?.requiredProductIds || []), ...(campaign.configuration?.rewardProductIds || []), ...(campaign.configuration?.productPairs || []).flatMap((pair) => [...(pair.requiredProductIds || (pair.requiredProductId ? [pair.requiredProductId] : [])), ...(pair.rewardProductIds?.length ? pair.rewardProductIds : (pair.rewardProductId ? [pair.rewardProductId] : []))])])];
  const categoryIds = [...new Set([...campaign.categories.map((item) => item.categoryId), ...(campaign.configuration?.productPairs || []).flatMap((pair) => pair.requiredCategoryIds || (pair.requiredCategoryId ? [pair.requiredCategoryId] : [])).filter(Boolean)])];
  const options = await getCampaignEditorOptions(productIds, categoryIds);
  const bannerMedia = campaign.bannerUrl ? await prisma.media.findFirst({ where: { name: campaign.bannerUrl }, select: { id: true, name: true } }) : null;
  const initialCampaign = { ...campaign, bannerMedia };
  return <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-5"><h1 className="text-2xl font-bold">Edit campaign</h1><CampaignForm {...options} initialCampaign={initialCampaign} /></div>;
}
