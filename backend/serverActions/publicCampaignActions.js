"use server";

import { getPublicCampaignProducts } from "@/backend/services/campaignService";

export async function getPublicCampaignProductPage(campaignId, page) {
  return getPublicCampaignProducts(campaignId, page);
}
