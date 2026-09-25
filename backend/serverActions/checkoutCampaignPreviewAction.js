"use server";

import prisma from "@/lib/prisma";
import { getActiveCampaigns, campaignBasePrice, applyProductCampaign, applyCartCampaign, applyPaymentCampaign, applyDeliveryCampaign } from "@/backend/services/campaignService";
import { getCheckoutDeliveryRates } from "@/backend/services/deliveryChargeService";
import { calculateDeliveryCharge } from "@/lib/deliveryCharge";

const money = (value) => Math.round(Math.max(0, Number(value) || 0) * 100) / 100;

function displayRow(campaign, discount) {
  return {
    id: campaign.id,
    name: campaign.name,
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
      .filter((item) => /^[a-f\d]{24}$/i.test(item.variationId) && item.quantity > 0);
    if (!requestedItems.length) return { success: true, data: { rows: [], total: 0 } };

    const variationIds = [...new Set(requestedItems.map((item) => item.variationId))];
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
    const variationMap = Object.fromEntries(variations.map((variation) => [variation.id, variation]));
    const provider = paymentMethod === "COD" ? null : paymentGatewayId
      ? await prisma.paymentGateway.findUnique({ where: { id: paymentGatewayId }, select: { code: true } })
      : null;
    const campaignPaymentMethod = paymentMethod === "COD" ? "COD" : provider?.code || paymentMethod;
    const campaigns = await getActiveCampaigns({ couponCode });
    const rowsByCampaign = new Map();
    const pricedItems = requestedItems.map((item) => {
      const variation = variationMap[item.variationId];
      if (!variation?.product) return null;
      const basePrice = campaignBasePrice(variation);
      const pricing = applyProductCampaign({
        campaigns,
        productId: variation.product.id,
        categoryId: variation.product.categoryId,
        basePrice,
      });
      if (pricing.campaign) {
        const current = rowsByCampaign.get(pricing.campaign.id) || { campaign: pricing.campaign, discount: 0 };
        current.discount += pricing.discount * item.quantity;
        rowsByCampaign.set(pricing.campaign.id, current);
      }
      return { item, variation, pricing, basePrice };
    }).filter(Boolean);
    if (!pricedItems.length) return { success: true, data: { rows: [], total: 0 } };

    const itemSubtotal = money(pricedItems.reduce((sum, line) => sum + line.pricing.price * line.item.quantity, 0));
    const campaignItems = pricedItems.map(({ item, variation, pricing }) => ({
      productId: variation.product.id,
      categoryId: variation.product.categoryId,
      quantity: item.quantity,
      basePrice: campaignBasePrice(variation),
      price: pricing.price,
    }));
    const cartPricing = applyCartCampaign({ campaigns, subtotal: itemSubtotal, items: campaignItems });
    if (cartPricing.campaign) rowsByCampaign.set(cartPricing.campaign.id, { campaign: cartPricing.campaign, discount: cartPricing.discount });
    const paymentPricing = applyPaymentCampaign({
      campaigns,
      subtotal: cartPricing.subtotal,
      paymentMethod: campaignPaymentMethod,
      items: campaignItems,
    });
    if (paymentPricing.campaign) rowsByCampaign.set(paymentPricing.campaign.id, { campaign: paymentPricing.campaign, discount: paymentPricing.discount });

    const weight = pricedItems.reduce((sum, line) => sum + Math.max(0, Number(line.variation.weight) || 0) * line.item.quantity, 0);
    const deliveryRates = await getCheckoutDeliveryRates();
    const originalDeliveryCharge = calculateDeliveryCharge(deliveryArea === "inside-dhaka" ? "inside-dhaka" : "outside-dhaka", weight, deliveryRates);
    const deliveryPricing = applyDeliveryCampaign({
      campaigns,
      subtotal: itemSubtotal,
      paymentMethod: campaignPaymentMethod,
      deliveryCharge: originalDeliveryCharge,
      items: campaignItems,
    });
    if (deliveryPricing.campaign) rowsByCampaign.set(deliveryPricing.campaign.id, { campaign: deliveryPricing.campaign, discount: deliveryPricing.discount });

    const rows = [...rowsByCampaign.values()]
      .filter((row) => row.discount > 0)
      .map((row) => displayRow(row.campaign, row.discount));
    return {
      success: true,
      data: {
        rows,
        total: money(paymentPricing.subtotal + deliveryPricing.deliveryCharge),
      },
    };
  } catch (error) {
    return { success: false, error: error?.message || "Campaign preview unavailable." };
  }
}
