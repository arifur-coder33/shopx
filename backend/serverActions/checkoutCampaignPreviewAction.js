"use server";
import { getCampaignRuleText } from "@/components/campaign/campaignRuleText";

import {
  applyCartCampaign,
  applyDeliveryCampaign,
  applyPaymentCampaign,
  applyPaymentDeliveryCampaign,
  applyProductCampaign,
  campaignBasePrice,
  getActiveCampaigns,
  selectCampaignsByPriority,
} from "@/backend/services/campaignService";
import { getCheckoutDeliveryRates } from "@/backend/services/deliveryChargeService";
import { calculateDeliveryCharge } from "@/lib/deliveryCharge";
import prisma from "@/lib/prisma";

const money = (value) =>
  Math.round(Math.max(0, Number(value) || 0) * 100) / 100;

function compatibleCampaigns(campaigns, selectedCampaigns) {
  if (!selectedCampaigns.length) return campaigns;
  const selectedIds = new Set(selectedCampaigns.map((campaign) => campaign.id));
  const canStack = selectedCampaigns.every((campaign) => campaign.stackable === true && campaign.exclusive !== true);
  return campaigns.filter((campaign) => selectedIds.has(campaign.id) || (canStack && campaign.stackable === true && campaign.exclusive !== true));
}

function displayRow(campaign, discount) {
  return {
    id: campaign.id,
    name: campaign.name,
    ruleText: getCampaignRuleText(campaign),
    discount: money(discount),
    startAt: campaign.startAt?.toISOString?.() || null,
    endAt: campaign.endAt?.toISOString?.() || null,
  };
}

export async function getCheckoutCampaignPreview({
  items = [],
  paymentMethod = null,
  paymentGatewayId = null,
  couponCode = "",
  deliveryArea = "outside-dhaka",
} = {}) {
  try {
    const requestedItems = (Array.isArray(items) ? items : [])
      .map((item) => ({
        variationId: String(item.variationId || ""),
        quantity: Math.max(0, Number(item.quantity) || 0),
      }))
      .filter(
        (item) => /^[a-f\d]{24}$/i.test(item.variationId) && item.quantity > 0,
      );
    if (!requestedItems.length)
      return { success: true, data: { rows: [], total: 0 } };

    const variationIds = [
      ...new Set(requestedItems.map((item) => item.variationId)),
    ];
    const variations = await prisma.productVariation.findMany({
      where: { id: { in: variationIds } },
      select: {
        id: true,
        regularPrice: true,
        discountPrice: true,
        weight: true,
        product: { select: { id: true, categoryId: true } },
      },
    });
    const variationMap = Object.fromEntries(
      variations.map((variation) => [variation.id, variation]),
    );
    const provider =
      paymentMethod === "COD"
        ? null
        : paymentGatewayId
          ? await prisma.paymentGateway.findUnique({
              where: { id: paymentGatewayId },
              select: { code: true },
            })
          : null;
    const campaignPaymentMethod =
      paymentMethod === "COD" ? "COD" : provider?.code || paymentMethod;
    const campaigns = await getActiveCampaigns({ couponCode });
    const priorityItems = requestedItems.map((item) => { const variation = variationMap[item.variationId]; if (!variation?.product) return null; const price = campaignBasePrice(variation); return { productId: variation.product.id, categoryId: variation.product.categoryId, quantity: item.quantity, basePrice: price, price }; }).filter(Boolean);
    const prioritizedCampaigns = selectCampaignsByPriority({ campaigns, items: priorityItems, paymentMethod: campaignPaymentMethod });
    const rowsByCampaign = new Map();
    const itemDiscounts = [];
    const selectedCampaigns = new Map();
    const compatible = () => compatibleCampaigns(prioritizedCampaigns, [...selectedCampaigns.values()]);
    const remember = (campaign) => { if (campaign) selectedCampaigns.set(campaign.id, campaign); };
    const pricedItems = requestedItems
      .map((item) => {
        const variation = variationMap[item.variationId];
        if (!variation?.product) return null;
        const basePrice = campaignBasePrice(variation);
        const pricing = applyProductCampaign({
          campaigns: compatible(),
          productId: variation.product.id,
          categoryId: variation.product.categoryId,
          basePrice,
        });
        if (pricing.campaign) { remember(pricing.campaign); itemDiscounts.push({ variationId: variation.id, productId: variation.product.id, name: pricing.campaign.name, ruleText: getCampaignRuleText(pricing.campaign), discount: money(pricing.discount), startAt: pricing.campaign.startAt?.toISOString?.() || null, endAt: pricing.campaign.endAt?.toISOString?.() || null }); }
        return { item, variation, pricing, basePrice };
      })
      .filter(Boolean);
    if (!pricedItems.length)
      return { success: true, data: { rows: [], total: 0 } };

    const itemSubtotal = money(
      pricedItems.reduce(
        (sum, line) => sum + line.pricing.price * line.item.quantity,
        0,
      ),
    );
    const campaignItems = pricedItems.map(({ item, variation, pricing }) => ({
      productId: variation.product.id,
      categoryId: variation.product.categoryId,
      quantity: item.quantity,
      basePrice: campaignBasePrice(variation),
      price: pricing.price,
    }));
    const cartPricing = applyCartCampaign({
      campaigns: compatible(),
      subtotal: itemSubtotal,
      items: campaignItems,
    });
    remember(cartPricing.campaign);
    if (cartPricing.campaign)
      rowsByCampaign.set(cartPricing.campaign.id, {
        campaign: cartPricing.campaign,
        discount: cartPricing.discount,
      });
    const paymentPricing = applyPaymentCampaign({
      campaigns: compatible(),
      subtotal: cartPricing.subtotal,
      paymentMethod: campaignPaymentMethod,
      items: campaignItems,
    });
    remember(paymentPricing.campaign);
    if (paymentPricing.campaign)
      rowsByCampaign.set(paymentPricing.campaign.id, {
        campaign: paymentPricing.campaign,
        discount: paymentPricing.discount,
      });

    const weight = pricedItems.reduce(
      (sum, line) =>
        sum +
        Math.max(0, Number(line.variation.weight) || 0) * line.item.quantity,
      0,
    );
    const deliveryRates = await getCheckoutDeliveryRates();
    const originalDeliveryCharge = calculateDeliveryCharge(
      deliveryArea === "inside-dhaka" ? "inside-dhaka" : "outside-dhaka",
      weight,
      deliveryRates,
    );
    const deliveryPricing = applyDeliveryCampaign({
      campaigns: compatible(),
      subtotal: itemSubtotal,
      paymentMethod: campaignPaymentMethod,
      deliveryCharge: originalDeliveryCharge,
      items: campaignItems,
    });
    remember(deliveryPricing.campaign);
    if (deliveryPricing.campaign)
      rowsByCampaign.set(deliveryPricing.campaign.id, {
        campaign: deliveryPricing.campaign,
        discount: deliveryPricing.discount,
      });

    const paymentDeliveryPricing = applyPaymentDeliveryCampaign({
      campaigns: compatible(),
      subtotal: itemSubtotal,
      paymentMethod: campaignPaymentMethod,
      deliveryCharge: deliveryPricing.deliveryCharge,
      items: campaignItems,
    });
    remember(paymentDeliveryPricing.campaign);
    if (paymentDeliveryPricing.campaign)
      rowsByCampaign.set(paymentDeliveryPricing.campaign.id, {
        campaign: paymentDeliveryPricing.campaign,
        discount: paymentDeliveryPricing.discount,
      });

    const rows = [...rowsByCampaign.values()]
      .filter((row) => row.discount > 0)
      .map((row) => displayRow(row.campaign, row.discount));
    return {
      success: true,
      data: {
        rows,
        itemDiscounts,
        total: money(paymentPricing.subtotal + paymentDeliveryPricing.deliveryCharge),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || "Campaign preview unavailable.",
    };
  }
}
