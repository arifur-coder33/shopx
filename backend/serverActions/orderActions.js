"use server";
import { getCheckoutDeliveryRates } from "@/backend/services/deliveryChargeService";
import { postCodCollection } from "@/backend/services/paymentPostingService";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import { calculateDeliveryCharge } from "@/lib/deliveryCharge";
import { parseBangladeshAddress } from "@/lib/bangladeshAddress";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { notifyOrderCreated } from "@/backend/services/orderRealtimeService";
import { deleteAbandonedCheckoutLeadByPhone } from "@/backend/services/abandonedCheckoutService";
import { headers } from "next/headers";
import { getIP } from "../utils/getIp";
import { assessOrderRisk } from "../utils/orderRisk";
import { updateRecentOrderRiskScores } from "@/backend/services/orderRiskService";
import { createOrderOriginCapability, enrichOrderOrigin } from "@/backend/services/orderGeoService";
import { getOrFetchSteadfastHistory } from "@/backend/services/steadfastFraudService";
import { getListCount } from "../utils/getListCount";
import { getListData } from "../utils/getListData";
import { getUserId, hasPermission } from "../utils/hasPermission";
import { addOrderTimeline } from "./orderTimelineActin";
import { firePurchaseServer } from "./SocialPurchaseEventAction";
import { applyCartCampaign, applyDeliveryCampaign, applyPaymentCampaign, applyPaymentDeliveryCampaign, applyProductCampaign, getActiveCampaigns, selectCampaignsByPriority } from "@/backend/services/campaignService";
import { CUSTOMER_ORDER_STATUS_GROUPS } from "@/lib/customerOrderStatus";
function compatibleCampaigns(campaigns, selectedCampaigns) {
  if (!selectedCampaigns.length) return campaigns;
  const selectedIds = new Set(selectedCampaigns.map((campaign) => campaign.id));
  const canStack = selectedCampaigns.every((campaign) => campaign.stackable === true && campaign.exclusive !== true);
  return campaigns.filter((campaign) => selectedIds.has(campaign.id) || (canStack && campaign.stackable === true && campaign.exclusive !== true));
}

const statusMap = CUSTOMER_ORDER_STATUS_GROUPS;
// export async function createOrder(formData) {
//   const h = await headers();
//   const ip = getIP(h);

//   try {
//     const userId = await getUserId(); // Ensure user is authenticated, will throw if not
//     const formDataObj = Object.fromEntries(formData.entries());
//     const data = { ...formDataObj };
//     const orderItems = JSON.parse(data?.products);

//     if (!data?.customerName || !data?.phoneNumber || !data?.deliveryAddress) {
//       throw new Error(
//         "আপনার নাম, মোবাইল নাম্বার এবং ডেলিভারি ঠিকানা সঠিকভাবে লিখুন।",
//       );
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1️⃣ Get or create counter
//       let counter = await tx.orderCounter.findFirst();

//       if (!counter) {
//         counter = await tx.orderCounter.create({
//           data: { lastOrderNumber: 240000020 },
//         });
//       }

//       const newOrderNumber = counter.lastOrderNumber + 1;

//       await tx.orderCounter.update({
//         where: { id: counter.id },
//         data: { lastOrderNumber: newOrderNumber },
//       });

//       // 2️⃣ Create Order
//       const order = await tx.order.create({
//         data: {
//           orderNo: newOrderNumber.toString(),
//           userId: userId || null,
//           customerName: data.customerName,
//           phoneNumber: data.phoneNumber,
//           email: data.email,
//           city: data.district,
//           deliveryCharge: Number(data.deliveryCharge),
//           orderPrice: Number(data.orderPrice),
//           deliveryAddress: data.deliveryAddress,
//           paymentMethod: data.paymentMethod,
//           note: data?.note,
//           fbc: data?.fbc,
//           fbp: data?.fbp,
//           gclid: data?.gclid,
//           ttclid: data?.ttclid,

//           userAgent: data?.userAgent,
//           ipAddress: ip,
//         },
//       });

//       // 3️⃣ Create Order Items
//       for (let i = 0; i < orderItems.length; i++) {
//         const item = orderItems[i];

//         if (!item?.variation?.id) {
//           throw new Error(`Product "${item.title}" variation missing`);
//         }

//         // 🔻 Stock check
//         const variation = await tx.productVariation.findUnique({
//           where: { id: item.variation.id },
//           select: { stock: true },
//         });

//         if (variation.stock < item.quantity) {
//           throw new Error(
//             `${item.title} product stock not available. We have only ${variation.stock}.`,
//           );
//         }

//         // 🔻 Stock minus
//         await tx.productVariation.update({
//           where: { id: item.variation.id },
//           data: {
//             stock: {
//               decrement: Number(item.quantity),
//             },
//           },
//         });

//         // 4️⃣ Create OrderItem
//         await tx.orderItem.create({
//           data: {
//             orderNo: newOrderNumber.toString(),
//             orderItemNo: i + 1,
//             productName: item.title,
//             price: Number(item.discountPrice || item.regularPrice),
//             quantity: Number(item.quantity),
//             productCode: item.productCode,
//             sku: item.sku,
//             thumbnail: item.thumbnail,

//             product: {
//               connect: { id: item.id },
//             },
//             variation: {
//               connect: { id: item.variation.id },
//             },
//             order: {
//               connect: { id: order.id },
//             },
//             combination: item.variation.combinationId
//               ? { connect: { id: item.variation.combinationId } }
//               : undefined,

//             combinations: JSON.stringify(
//               item.variation.combinations?.map((c) => ({
//                 name: c.variationName.name,
//                 value: c.variationValue.value,
//               })) || [],
//             ),
//           },
//         });
//       }
//       await addOrderTimeline({
//         orderId: order.id,
//         orderNo: newOrderNumber.toString(),
//         status: "PENDING",
//         title: "Order Created",
//         message: "Your order has been created and is pending confirmation.",
//         createdBy: "user",
//       });
//       return order;
//     });

//     Promise.all([
//       // notifyNewOrder(result).catch((err) => console.error("SMS error:", err)),
//       revalidatePath("/admin/orders"),
//       revalidateTag("orders"),
//     ]);
//     return { success: true, data: result }; // Return success with order data
//   } catch (error) {
//     console.log(error.message);
//     return { success: false, error: error.message }; // Return structured error
//   }
// }

// A helper to dynamically create the 'select' object for Prisma
// This ensures we only fetch data that the table actually needs.

// export async function getAllOrder(params) {
//   try {
//     const {
//       limit = 10,
//       cursor,
//       tableProperties,
//       sortField = "createdAt",
//       sortDirection = "desc",
//       // ...other filters
//       orderNo,
//       sku,
//       phoneNumber,
//       status,
//       startDate,
//       endDate,
//     } = params;

//     const whereClause = {};
//     if (orderNo)
//       whereClause.orderNo = { contains: orderNo, mode: "insensitive" };
//     if (status) whereClause.status = status;
//     if (startDate && endDate) {
//       whereClause.createdAt = {
//         gte: new Date(startDate),
//         lte: new Date(endDate),
//       };
//     }
//     if (sku) {
//       whereClause.orderItems = {
//         some: { sku: { contains: sku, mode: "insensitive" } },
//       };
//     }
//     if (phoneNumber) {
//       whereClause.phoneNumber = { contains: phoneNumber, mode: "insensitive" };
//     }

//     const selectFields = getDataSelectFields(tableProperties);

//     const requestedLimit = Number(limit);
//     const items = await prisma.order.findMany({
//       take: requestedLimit + 1,
//       where: whereClause,
//       select: selectFields,
//       cursor: cursor ? { id: cursor } : undefined,
//       // The `skip: 1` is NECESSARY and CORRECT for Prisma's cursor implementation
//       // to exclude the cursor itself and start on the next record.
//       skip: cursor ? 1 : 0,
//       orderBy: { [sortField]: sortDirection },
//     });

//     let nextCursor = null;
//     // Check if we received more items than the requested page size.
//     if (items.length > requestedLimit) {
//       // --- THE CRITICAL FIX IS HERE ---
//       // 1. Remove the extra item that we fetched only to check for a next page.
//       items.pop();

//       // 2. The new cursor is the ID of the LAST item in the *remaining* array.
//       nextCursor = items[items.length - 1].id;
//     }

//     return {
//       success: true,
//       data: items,
//       nextCursor: nextCursor,
//     };
//   } catch (error) {
//     console.error("Failed to get orders:", error);
//     return { success: false, error: error.message };
//   }
// }
export async function createOrder(formData) {
  const [h, userId] = await Promise.all([headers(), getUserId()]);
  const ip = getIP(h);
  const userAgent = h.get("user-agent") || "";
  const originValue = (...names) => names.map((name) => h.get(name)).find(Boolean) || null;
  let orderOrigin = {
    city: originValue("x-vercel-ip-city", "cf-ipcity"),
    region: originValue("x-vercel-ip-country-region", "cf-region"),
    country: originValue("x-vercel-ip-country", "cf-ipcountry"),
    latitude: originValue("x-vercel-ip-latitude", "cf-iplatitude"),
    longitude: originValue("x-vercel-ip-longitude", "cf-iplongitude"),
    source: h.get("cf-ipcity") ? "Cloudflare" : h.get("x-vercel-ip-city") ? "Vercel" : null,
  };
  if (!Object.values(orderOrigin).some(Boolean)) orderOrigin.city = null;
  try {
    const data = Object.fromEntries(formData.entries());
    const orderItems = JSON.parse(data?.products);
    const requestedPaymentMethod = String(data.paymentMethod || "").toUpperCase();
    const paymentPlan = String(data.paymentPlan || "FULL").toUpperCase();
    let paymentMethod = requestedPaymentMethod;
    if (
      !data?.customerName ||
      !data?.phoneNumber ||
      !data?.deliveryAddress ||
      !Array.isArray(orderItems) ||
      !orderItems.length
    ) {
      throw new Error(
        "আপনার নাম, মোবাইল নাম্বার এবং সম্পূর্ণ ডেলিভারি ঠিকানা সঠিকভাবে লিখুন।",
      );
    }
    const { verifyBangladeshDeliveryAddress } = await import("@/backend/services/chatAiReplyService");
    const fullAddressForCheck = [data.deliveryAddress, data.thana, data.district].map((part) => String(part || "").trim()).filter(Boolean).join(", ");
    const addressAI = await verifyBangladeshDeliveryAddress(fullAddressForCheck);
    const addressVerificationAvailable = addressAI.available;
    if (addressAI.available && !addressAI.valid) throw new Error(addressAI.error || "ঠিকানাটি যাচাই করা যায়নি। বাসা/রোড/এলাকা, থানা ও জেলার নামসহ লিখুন।");
    if (addressAI.available && addressAI.valid) {
      data.district = addressAI.district;
      data.thana = addressAI.thana;
    } else {
      const parsedAddress = parseBangladeshAddress(data.deliveryAddress);
      if (!parsedAddress.valid) throw new Error(parsedAddress.error);
      data.district = parsedAddress.district;
      data.thana = parsedAddress.thana;
    }
    if (!/^(?:01[3-9]\d{8}|8801[3-9]\d{8})$/.test(String(data.phoneNumber).replace(/\D/g, ""))) {
      throw new Error("সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01712345678 অথবা 8801712345678)।");
    }
    if (!["COD", "ONLINE", "EMI"].includes(requestedPaymentMethod)) {
      throw new Error("Select a valid payment method.");
    }
    const chatCheckoutKey = /^chat:[a-f0-9-]{36}$/u.test(String(data.chatCheckoutKey || "")) ? data.chatCheckoutKey : null;
    if (chatCheckoutKey) {
      const existing = await prisma.order.findUnique({ where: { chatCheckoutKey }, select: { id: true, orderNo: true, phoneNumber: true } });
      if (existing) {
        if (existing.phoneNumber !== data.phoneNumber) throw new Error("Order request does not match.");
        return { success: true, data: existing };
      }
    }
    if (!["FULL", "MINIMUM"].includes(paymentPlan)) throw new Error("Select a valid payment plan.");
    if (requestedPaymentMethod !== "COD" && !data.paymentGatewayId) {
      throw new Error("Select an online payment gateway.");
    }
    if (paymentPlan === "MINIMUM" && requestedPaymentMethod === "COD") throw new Error("Select an online payment gateway for the advance payment.");
    const historySince = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const riskHistoryPromise = (requestedPaymentMethod === "COD" || paymentPlan === "MINIMUM") ? prisma.order.findMany({
      where: {
        createdAt: { gte: historySince },
        OR: [
          { phoneNumber: data.phoneNumber },
          ...(ip && userAgent ? [{ ipAddress: ip, userAgent }] : []),
        ],
      },
      select: {
        id: true, phoneNumber: true, ipAddress: true, userAgent: true, status: true, paymentMethod: true, createdAt: true,
        orderPrice: true, deliveryCharge: true, deliveryAddress: true, city: true, thana: true,
        fraudRiskFactors: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }) : Promise.resolve([]);
    const variationIds = orderItems.map((item) => item.variation.id);
    const campaignsPromise = getActiveCampaigns({ couponCode: data.campaignCode, includeComboDisplayNames: false });
    const deliveryRatesPromise = getCheckoutDeliveryRates();
    const providerPromise = paymentMethod !== "COD"
      ? prisma.paymentGateway.findUnique({ where: { id: data.paymentGatewayId }, include: { moneyAccount: true } })
      : prisma.paymentGateway.findFirst({ where: { adapterKey: "COD", isActive: true } });
    const codProviderPromise = paymentPlan === "MINIMUM"
      ? prisma.paymentGateway.findFirst({ where: { adapterKey: "COD", isActive: true }, include: { moneyAccount: true } })
      : Promise.resolve(null);
    const variationsPromise = prisma.productVariation.findMany({
      where: { id: { in: variationIds } },
      select: {
        id: true,
        sku: true,
        regularPrice: true,
        discountPrice: true,
        weight: true,
        stocks: { select: { available: true } },
        product: {
          select: {
            id: true,
            title: true,
            productCode: true,
            categoryId: true,
            allowOutOfStockOrder: true,
            codAvailable: true,
            advancePaymentType: true,
            advancePaymentValueType: true,
            advancePaymentValue: true,
          },
        },
      },
    });
    const [variations, activeCampaigns, deliveryRates, provider, riskHistory, codProvider] = await Promise.all([variationsPromise, campaignsPromise, deliveryRatesPromise, providerPromise, riskHistoryPromise, codProviderPromise]);
    const paymentRuleProducts = variations.map((variation) => variation.product);
    const requiresProductPaymentPlan = paymentRuleProducts.some((product) => product.codAvailable === false || ["DELIVERY_FEE", "PARTIAL"].includes(product.advancePaymentType));
    const allProductsAllowCod = paymentRuleProducts.every((product) => product.codAvailable !== false);
    if (requestedPaymentMethod === "COD" && (requiresProductPaymentPlan || !allProductsAllowCod)) {
      throw new Error("এই পণ্যের জন্য COD নির্বাচন করা যাবে না। ন্যূনতম বা পুরো অনলাইন পেমেন্ট বেছে নিন।");
    }
    if (requiresProductPaymentPlan) {
      if (requestedPaymentMethod === "COD") throw new Error("এই পণ্যের জন্য advance payment plan নির্বাচন করুন।");
      const canCollectRemainderByCod = paymentPlan === "MINIMUM" && allProductsAllowCod && getProviderRuntimeConfiguration("gateway", codProvider).ready;
      paymentMethod = canCollectRemainderByCod ? "COD" : paymentPlan === "MINIMUM" ? "ONLINE" : requestedPaymentMethod;
    } else {
      if (paymentPlan === "MINIMUM") throw new Error("এই পণ্যের জন্য minimum advance নির্ধারিত নেই।");
      paymentMethod = requestedPaymentMethod;
    }
    const providerConfiguration = provider ? getProviderRuntimeConfiguration("gateway", provider) : null;
    if (!providerConfiguration?.ready) throw new Error(paymentMethod === "COD" ? "Cash on Delivery is currently disabled." : "The selected provider is unavailable or not fully configured.");
    if (paymentMethod === "EMI" && provider?.adapterKey !== "SSLCOMMERZ") throw new Error("Installment payment is available only through SSLCommerz.");
    const variationMap = Object.fromEntries(
      variations.map((v) => [
        v.id,
        {
          ...v,
          available: v.stocks.reduce(
            (sum, stock) => sum + Math.max(0, stock.available || 0),
            0,
          ),
        },
      ]),
    );
    const requestedByVariation = orderItems.reduce(
      (map, item) =>
        map.set(
          item.variation.id,
          (map.get(item.variation.id) || 0) + Number(item.quantity),
        ),
      new Map(),
    );
    for (const [variationId, requested] of requestedByVariation) {
      const variation = variationMap[variationId];
      if (!variation)
        throw new Error("Selected product variation was not found.");
      if (
        !variation.product?.allowOutOfStockOrder &&
        variation.available < requested
      ) {
        const item = orderItems.find((row) => row.variation.id === variationId);
        throw new Error(`${item.title} এখন স্টকে নেই।`);
      }
    }
    const serverOrderPrice = orderItems.reduce((total, item) => {
      const variation = variationMap[item.variation.id];
      const unitPrice = Number(variation.discountPrice) > 0 && Number(variation.discountPrice) < Number(variation.regularPrice)
        ? Number(variation.discountPrice)
        : Number(variation.regularPrice);
      if (!Number.isFinite(Number(unitPrice)))
        throw new Error(`Price is unavailable for ${variation.product.title}.`);
      return total + Number(item.quantity) * Number(unitPrice);
    }, 0);
    const serverOrderWeight = orderItems.reduce((total, item) => {
      const variation = variationMap[item.variation.id];
      return (
        total +
        Math.max(0, Number(variation.weight) || 0) * Number(item.quantity)
      );
    }, 0);
    const deliveryArea =
      data.deliveryArea === "inside-dhaka" ? "inside-dhaka" : "outside-dhaka";

    const result = await prisma.$transaction(async (tx) => {
      const campaignPaymentMethod = provider?.code || paymentMethod;
      // Campaigns are evaluated here, after trusted product data is loaded.
      // Browser-supplied totals and prices are never used for the order.
      const comboRewardLines = orderItems.filter((item) => item.comboReward === true);
      const purchasedLines = orderItems.filter((item) => item.comboReward !== true);
      const comboCampaignById = new Map(activeCampaigns.filter((campaign) => campaign.type === "COMBO" || campaign.group === "COMBO").map((campaign) => [campaign.id, campaign]));
      const comboCampaignsUsed = new Map();
      for (const item of comboRewardLines) {
        const variation = variationMap[item.variation.id];
        const campaign = comboCampaignById.get(item.comboCampaignId);
        const pair = campaign?.configuration?.productPairs?.find((candidate) => (candidate.rewardProductIds || (candidate.rewardProductId ? [candidate.rewardProductId] : [])).includes(variation?.product?.id));
        if (!campaign || !pair) throw new Error("এই combo reward আর চালু নেই। পণ্যগুলো আবার যাচাই করুন।");
        const requiredQty = Math.max(1, Number(campaign.configuration?.requiredQuantity) || 1);
        const qualifyingQty = purchasedLines.reduce((sum, purchased) => {
          const source = variationMap[purchased.variation.id];
          if (!source?.product) return sum;
          const matches = pair.triggerType === "ALL" || (pair.triggerType === "PRODUCT"
            ? (pair.requiredProductIds || (pair.requiredProductId ? [pair.requiredProductId] : [])).includes(source.product.id)
            : (pair.requiredCategoryIds || (pair.requiredCategoryId ? [pair.requiredCategoryId] : [])).includes(source.product.categoryId));
          return sum + (matches ? Number(purchased.quantity) || 0 : 0);
        }, 0);
        const rewardQuantity = Math.max(1, Number(campaign.configuration?.rewardQuantity) || 1);
        if (qualifyingQty < requiredQty || Number(item.quantity) !== rewardQuantity) throw new Error("Combo offer-এর শর্ত পূরণ হয়নি। পণ্যগুলো আবার যাচাই করুন।");
        comboCampaignsUsed.set(campaign.id, campaign);
      }
      const priorityItems = purchasedLines.map((item) => { const variation = variationMap[item.variation.id]; const regular = Number(variation.regularPrice); const sale = Number(variation.discountPrice); const price = sale > 0 && sale < regular ? sale : regular; return { productId: variation.product.id, categoryId: variation.product.categoryId, quantity: Number(item.quantity), basePrice: price, price }; });
      const prioritizedCampaigns = selectCampaignsByPriority({ campaigns: activeCampaigns, items: priorityItems, paymentMethod: campaignPaymentMethod });
      const selectedCampaigns = new Map();
      const compatible = () => compatibleCampaigns(prioritizedCampaigns, [...selectedCampaigns.values()]);
      const remember = (campaign) => { if (campaign) selectedCampaigns.set(campaign.id, campaign); };
      const pricedItems = orderItems.map((item) => {
        const variation = variationMap[item.variation.id];
        const regular = Number(variation.regularPrice);
        const discounted = Number(variation.discountPrice);
        const basePrice = discounted > 0 && discounted < regular ? discounted : regular;
        let pricing;
        if (item.comboReward === true) {
          const campaign = comboCampaignById.get(item.comboCampaignId);
          const comboType = campaign.configuration?.comboType || "BUNDLE_FIXED";
          const percent = comboType === "BUY_X_GET_Y" ? 100
            : comboType === "BUY_X_GET_Y_DISCOUNT" ? Number(campaign.configuration?.rewardDiscountPercent || 0)
              : comboType === "BUNDLE_PERCENT" || (comboType === "QUANTITY" && campaign.discountType === "PERCENT") ? Number(campaign.discountValue || 0) : 0;
          const fixed = comboType === "QUANTITY" && campaign.discountType !== "PERCENT" ? Number(campaign.discountValue || 0) : 0;
          let rewardPrice = Math.max(0, Math.round((basePrice * (1 - Math.min(100, percent) / 100) - fixed) * 100) / 100);
          if (comboType === "BUNDLE_FIXED") {
            const pair = campaign.configuration?.productPairs?.find((candidate) => (candidate.rewardProductIds || (candidate.rewardProductId ? [candidate.rewardProductId] : [])).includes(variation.product.id));
            const qualifying = purchasedLines.filter((purchased) => {
              const source = variationMap[purchased.variation.id];
              return source?.product && pair && (pair.triggerType === "ALL" || (pair.triggerType === "PRODUCT"
                ? (pair.requiredProductIds || (pair.requiredProductId ? [pair.requiredProductId] : [])).includes(source.product.id)
                : (pair.requiredCategoryIds || (pair.requiredCategoryId ? [pair.requiredCategoryId] : [])).includes(source.product.categoryId)));
            });
            const triggerSubtotal = qualifying.reduce((sum, purchased) => {
              const source = variationMap[purchased.variation.id];
              const regular = Number(source.regularPrice) || 0;
              const sale = Number(source.discountPrice) || 0;
              return sum + (sale > 0 && sale < regular ? sale : regular) * (Number(purchased.quantity) || 1);
            }, 0);
            const rewardCount = (pair?.rewardProductIds || (pair?.rewardProductId ? [pair.rewardProductId] : [])).length * Math.max(1, Number(campaign.configuration?.rewardQuantity) || 1);
            rewardPrice = Math.max(0, Math.round((Number(campaign.discountValue || 0) - triggerSubtotal) / Math.max(1, rewardCount) * 100) / 100);
          }
          pricing = { price: rewardPrice, discount: Math.max(0, basePrice - rewardPrice), campaign };
          remember(campaign);
        } else {
          pricing = applyProductCampaign({ campaigns: compatible(), productId: variation.product.id, categoryId: variation.product.categoryId, basePrice });
          remember(pricing.campaign);
        }
        return { item, variation, pricing };
      });
      const campaignOrderPrice = pricedItems.reduce((total, { item, pricing }) => total + pricing.price * Number(item.quantity), 0);
      const campaignItems = pricedItems.map(({ item, variation, pricing }) => ({ productId: variation.product.id, categoryId: variation.product.categoryId, quantity: Number(item.quantity), basePrice: Number(variation.discountPrice) > 0 && Number(variation.discountPrice) < Number(variation.regularPrice) ? Number(variation.discountPrice) : Number(variation.regularPrice), price: pricing.price }));
      const cartPricing = applyCartCampaign({ campaigns: compatible(), subtotal: campaignOrderPrice, items: campaignItems });
      remember(cartPricing.campaign);
      const paymentPricing = applyPaymentCampaign({ campaigns: compatible(), subtotal: cartPricing.subtotal, paymentMethod: campaignPaymentMethod, items: campaignItems });
      remember(paymentPricing.campaign);
      const originalDeliveryCharge = calculateDeliveryCharge(
        deliveryArea,
        serverOrderWeight,
        deliveryRates,
      );
      const deliveryPricing = applyDeliveryCampaign({ campaigns: compatible(), subtotal: campaignOrderPrice, paymentMethod: campaignPaymentMethod, deliveryCharge: originalDeliveryCharge, items: campaignItems });
      remember(deliveryPricing.campaign);
      const paymentDeliveryPricing = applyPaymentDeliveryCampaign({ campaigns: compatible(), subtotal: campaignOrderPrice, paymentMethod: campaignPaymentMethod, deliveryCharge: deliveryPricing.deliveryCharge, items: campaignItems });
      remember(paymentDeliveryPricing.campaign);
      const deliveryCharge = paymentDeliveryPricing.deliveryCharge;
      const totalDeliveryDiscount = deliveryPricing.discount + paymentDeliveryPricing.discount;
      const merchandiseTotal = paymentPricing.subtotal;
      const totalAmount = merchandiseTotal + deliveryCharge;
      if (chatCheckoutKey && data.expectedTotal && Math.abs(Number(data.expectedTotal) - totalAmount) > 0.01) throw new Error("দাম বা ডেলিভারি চার্জ পরিবর্তিত হয়েছে। নতুন সারাংশ দেখে আবার নিশ্চিত করুন।");
      const requiredAdvance = (paymentRuleProducts.some((product) => product.advancePaymentType === "DELIVERY_FEE") ? deliveryCharge : 0) + pricedItems.reduce((sum, { item, variation, pricing }) => {
        const product = variation.product;
        if (product.advancePaymentType !== "PARTIAL") return sum;
        const value = Math.max(0, Number(product.advancePaymentValue) || 0);
        const quantity = Number(item.quantity) || 1;
        const lineAmount = pricing.price * quantity;
        const lineAdvance = product.advancePaymentValueType === "PERCENT"
          ? lineAmount * Math.min(100, value) / 100
          : value * quantity;
        return sum + lineAdvance;
      }, 0);
      const minimumPaymentAmount = Math.min(totalAmount, Math.max(0, Math.round(requiredAdvance * 100) / 100));
      if (paymentPlan === "MINIMUM" && (!requiresProductPaymentPlan || minimumPaymentAmount <= 0 || minimumPaymentAmount >= totalAmount)) {
        throw new Error("এই পণ্যের minimum payment amount সঠিকভাবে সেট করা নেই।");
      }
      const initialPaymentAmount = paymentPlan === "MINIMUM" ? minimumPaymentAmount : totalAmount;
      const riskAssessment = assessOrderRisk({
        paymentMethod,
        orderAmount: totalAmount,
        phoneNumber: data.phoneNumber,
        ipAddress: ip,
        userAgent,
        deliveryAddress: data.deliveryAddress,
        city: data.district,
        thana: data.thana,
        history: riskHistory,
        orderCreatedAt: new Date(),
      });
      const appliedCampaigns = [
        ...pricedItems.map(({ pricing }) => pricing.campaign),
        ...comboCampaignsUsed.values(),
        cartPricing.campaign,
        paymentPricing.campaign,
        deliveryPricing.campaign,
        paymentDeliveryPricing.campaign,
      ].filter(Boolean);
      const campaignDiscounts = new Map();
      const addCampaignDiscount = (campaign, amount) => {
        if (!campaign || !(Number(amount) > 0)) return;
        const current = campaignDiscounts.get(campaign.id) || { id: campaign.id, name: campaign.name, group: campaign.group || campaign.type, discount: 0 };
        current.discount = Math.round((current.discount + Number(amount)) * 100) / 100;
        campaignDiscounts.set(campaign.id, current);
      };
      pricedItems.forEach(({ item, pricing }) => addCampaignDiscount(pricing.campaign, pricing.discount * Number(item.quantity)));
      [cartPricing, paymentPricing, deliveryPricing, paymentDeliveryPricing].forEach(({ campaign, discount }) => addCampaignDiscount(campaign, discount));
      const counter = await tx.orderCounter.upsert({
        where: { idNo: 11 },
        update: { lastOrderNumber: { increment: 1 } },
        create: { idNo: 11, lastOrderNumber: 240000020 },
        select: { lastOrderNumber: true },
      });
      const newOrderNumber = counter.lastOrderNumber.toString();
      const order = await tx.order.create({
        data: {
          orderNo: newOrderNumber,
          chatCheckoutKey,
          userId: userId || null,
          customerName: data.customerName,
          phoneNumber: data.phoneNumber,
          email: data.email,
          city: data.district,
          thana: data.thana,
          deliveryArea,
          deliveryCharge,
          orderPrice: merchandiseTotal,
          subtotal: campaignOrderPrice,
          productDiscount: pricedItems.reduce((sum, { item, pricing }) => sum + (item.comboReward ? 0 : pricing.discount * Number(item.quantity)), 0),
          comboDiscount: pricedItems.reduce((sum, { item, pricing }) => sum + (item.comboReward ? pricing.discount * Number(item.quantity) : 0), 0),
          cartDiscount: cartPricing.discount,
          paymentDiscount: paymentPricing.discount,
          deliveryDiscount: totalDeliveryDiscount,
          appliedCampaignIds: [...new Set(appliedCampaigns.map((campaign) => campaign.id))],
          appliedCampaignNames: [...new Set(appliedCampaigns.map((campaign) => campaign.name))],
          appliedCampaignBreakdown: [...campaignDiscounts.values()],
          fraudRiskScore: riskAssessment.score,
          fraudRiskLevel: riskAssessment.level,
          fraudRiskFactors: [
            ...riskAssessment.factors,
            ...(!addressVerificationAvailable ? [{ code: "ADDRESS_NOT_VERIFIED_BY_AI", points: 0, label: "ঠিকানা AI দিয়ে যাচাই হয়নি", detail: "AI address verification is unavailable; the customer-provided address was saved." }] : []),
            ...(Object.values(orderOrigin).some(Boolean) ? [{ code: "ORDER_ORIGIN", points: 0, origin: orderOrigin }] : []),
          ],
          appliedCouponCode: data.campaignCode ? String(data.campaignCode).trim().toUpperCase() : null,
          orderWeight: serverOrderWeight,
          deliveryAddress: data.deliveryAddress,
          paymentMethod,
          paymentStatus: "PENDING",
          selectedPaymentGatewayId:
            paymentMethod !== "COD" ? provider.id : null,
          selectedCourierProviderId: null,
          paidAmount: 0,
          dueAmount: totalAmount,
          note: data?.note,
          fbc: data?.fbc,
          fbp: data?.fbp,
          gclid: data?.gclid,
          ttclid: data?.ttclid || "",
          userAgent,
          ipAddress: ip,
          orderItems: {
            create: pricedItems.map(({ item, variation, pricing }, i) => ({
              orderNo: newOrderNumber,
              orderItemNo: i + 1,
              productName: variation.product.title,
              campaignName: pricing.campaign?.name || null,
              campaignDiscount: Math.round(Number(pricing.discount || 0) * Number(item.quantity) * 100) / 100,
              price: pricing.price,
              quantity: Number(item.quantity),
              productCode: variation.product.productCode,
              sku: variation.sku,
              thumbnail: item.thumbnail,
              productId: variation.product.id,
              variationId: variation.id,
              combinationId: item.variation.combinationId || undefined,
              combinations: JSON.stringify(
                item.variation.combinations?.map((c) => ({
                  name: c.variationName.name,
                  value: c.variationValue.value,
                })) || [],
              ),
            })),
          },
          payments: {
            create: {
              gateway: paymentPlan === "MINIMUM" || paymentMethod !== "COD" ? provider.code : "COD",
              paymentMethod: paymentPlan === "MINIMUM" ? "ONLINE" : paymentMethod,
              paymentGatewayId: paymentPlan === "MINIMUM" || paymentMethod !== "COD" ? provider.id : null,
              courierProviderId: null,
              amount: initialPaymentAmount,
              status: "PENDING",
            },
          },
          timeline: {
            create: {
              orderNo: newOrderNumber,
              status: "PENDING",
              title: "Order Created",
              message: "Your order has been created and is pending confirmation.",
              createdBy: "user",
            },
          },
        },
        select: { id: true, orderNo: true, phoneNumber: true, payments: { select: { id: true } } },
      });
      const appliedCampaignIds = [...new Set(appliedCampaigns.map((campaign) => campaign.id))];
      if (appliedCampaignIds.length) {
        await tx.campaignUsage.createMany({ data: appliedCampaignIds.map((campaignId) => ({ campaignId, orderId: order.id, customerKey: data.phoneNumber || null })) });
      }
      const { payments: createdPayments, ...createdOrder } = order;
      return {
        ...createdOrder,
        paymentId: createdPayments[0]?.id,
        providerCode: paymentMethod !== "COD" ? provider.code : "COD",
      };
    });
    after(async () => {
      await updateRecentOrderRiskScores({ orderId: result.id, history: riskHistory });
      await enrichOrderOrigin({ orderId: result.id, ipAddress: ip });
      const steadfastHistory = await getOrFetchSteadfastHistory(result.id);
      if (!steadfastHistory.success) console.warn("Steadfast history was not saved for this order:", steadfastHistory.error);
      await Promise.all([
        notifyOrderCreated(result.id),
        deleteAbandonedCheckoutLeadByPhone(data.phoneNumber),
      ]);
    });
    return {
      success: true,
      data: {
        ...result,
        originCapability: createOrderOriginCapability(result.id),
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
export async function getRecentOrdersForAdmin({ limit = 50, cursorId, status, includeUnseenCount = false } = {}) {
  await hasPermission("order", "view");
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 50));
  const allowedStatuses = ["PENDING", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "DELIVERY_FAILED", "CANCELLED", "FAILED_RETURNING", "FAILED_RETURN_RECEIVED", "RETURNING", "RETURNED", "REFUNDING", "REFUNDED"];
  const where = allowedStatuses.includes(status) ? { status } : {};
  const rowsPromise = prisma.order.findMany({
    where,
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    take: pageSize + 1,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, orderNo: true, status: true, customerName: true, phoneNumber: true,
      deliveryAddress: true, thana: true, city: true, orderPrice: true,
      deliveryCharge: true, paymentMethod: true, paymentStatus: true, paidAmount: true, dueAmount: true, createdAt: true, viewedBy: true,
      fraudRiskScore: true, fraudRiskLevel: true, fraudRiskFactors: true,
      orderItems: { select: { id: true, productName: true, price: true, quantity: true, thumbnail: true } },
    },
  });
  const [rows, userId] = await Promise.all([
    rowsPromise,
    includeUnseenCount ? getUserId() : Promise.resolve(null),
  ]);
  const unseenCount = userId
    ? await prisma.order.count({ where: { NOT: { viewedBy: { has: userId } } } })
    : 0;
  return {
    orders: rows.slice(0, pageSize),
    hasMore: rows.length > pageSize,
    ...(includeUnseenCount ? { unseenCount } : {}),
  };
}

export async function markOrderViewedAction(orderId) {
  await hasPermission("order", "view");
  const userId = await getUserId();
  if (!userId) return { success: false, message: "অনুগ্রহ করে আবার লগইন করুন।" };
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { viewedBy: true } });
  if (!order) return { success: false, message: "অর্ডার পাওয়া যায়নি।" };
  if (!(order.viewedBy || []).includes(userId)) {
    await prisma.order.update({ where: { id: orderId }, data: { viewedBy: { push: userId } } });
  }
  return { success: true };
}
export async function getAllOrder(params) {
  return getListData({
    prisma,
    model: "order",
    params,
    searchableFields: [
      { field: "orderNo", type: "string", mode: "sensitive" },
      { field: "phoneNumber", type: "string", mode: "sensitive" },
      { field: "status", type: "enum" }, // ✅ ENUM safe
    ],
    relationSearch: {
      sku: {
        relation: "orderItems",
        field: "sku",
        type: "string",
        mode: "sensitive",
      },
    },
    dateField: "createdAt",
  });
}

export async function getOrderCount(params) {
  return getListCount({
    prisma,
    model: "order",
    params,
    searchableFields: [
      { field: "orderNo", type: "string", mode: "sensitive" },
      { field: "phoneNumber", type: "string", mode: "sensitive" },
      { field: "status", type: "enum" },
    ],
    relationSearch: {
      sku: {
        relation: "orderItems",
        field: "sku",
        type: "string",
        mode: "sensitive",
      },
    },
    dateField: "createdAt",
  });
}

// export async function getOrderCount(params) {
//   try {
//     const { orderNo, sku, phoneNumber, status, startDate, endDate } = params;

//     const whereClause = {};
//     if (orderNo)
//       whereClause.orderNo = { contains: orderNo, mode: "insensitive" };
//     if (status) whereClause.status = status;
//     if (startDate && endDate) {
//       whereClause.createdAt = {
//         gte: new Date(startDate),
//         lte: new Date(endDate),
//       };
//     }
//     if (sku) {
//       whereClause.orderItems = {
//         some: { sku: { contains: sku, mode: "insensitive" } },
//       };
//     }
//     if (phoneNumber) {
//       whereClause.phoneNumber = { contains: phoneNumber, mode: "insensitive" };
//     }

//     const count = await prisma.order.count({
//       where: whereClause,
//     });

//     return { success: true, count };
//   } catch (error) {
//     console.error("Failed to get order count:", error);
//     return { success: false, error: error.message };
//   }
// }
export async function getOrderByOrderNo({ orderId, orderNo, phoneNumber }) {
  console.log("start load", orderNo, phoneNumber);
  try {
    let finalOrderId = orderId;

    // orderId না থাকলে orderNo + phoneNumber দিয়ে Order খুঁজবে
    if (!finalOrderId) {
      if (!orderNo || !phoneNumber) {
        throw new Error(
          "Either orderId or both orderNo and phoneNumber are required",
        );
      }

      const order = await prisma.order.findFirst({
        where: {
          orderNo,
          phoneNumber,
        },
        select: {
          id: true,
        },
      });

      if (!order) {
        return {
          supersede: true,
          data: [],
        };
      }

      finalOrderId = order.id;
    }
    const data = await prisma.order.findUnique({
      where: { id: finalOrderId },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });
    console.log("data", data);
    return { success: true, data }; // Return success with product data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getOrderById(orderId) {
  try {
    await hasPermission("order", "view");
    const data = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { variation: true, combination: true } },
        shipping: { include: { courierProvider: true } },
        selectedPaymentGateway: true,
        selectedCourierProvider: true,
        payments: { include: { paymentGateway: true, courierProvider: true, moneyAccount: true } },
      },
    });
    if (!data) return { success: true, data: null };
    const customerHistory = await getCustomerOrderHistoryForAdmin(data.phoneNumber);
    return { success: true, data: { ...data, customerHistory: customerHistory.data || null } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getCustomerOrderHistoryForAdmin(phoneNumber, offset = 0) {
  try {
    await hasPermission("order", "view");
    const phone = String(phoneNumber || "").trim();
    if (!phone) return { success: false, error: "Customer phone is required." };
    const safeOffset = Math.max(0, Number.parseInt(offset, 10) || 0);
    const returnedStatuses = ["RETURNING", "RETURNED", "FAILED_RETURNING", "FAILED_RETURN_RECEIVED"];
    const [total, delivered, returned, data] = await Promise.all([
      prisma.order.count({ where: { phoneNumber: phone } }),
      prisma.order.count({ where: { phoneNumber: phone, status: "DELIVERED" } }),
      prisma.order.count({ where: { phoneNumber: phone, status: { in: returnedStatuses } } }),
      prisma.order.findMany({
        where: { phoneNumber: phone },
        orderBy: { createdAt: "desc" },
        skip: safeOffset,
        take: 30,
        select: {
          id: true, orderNo: true, status: true, createdAt: true,
          orderPrice: true, deliveryCharge: true,
          orderItems: { select: { id: true, productName: true, quantity: true } },
        },
      }),
    ]);
    return {
      success: true,
      data: {
        total, delivered, returned,
        orders: data,
        nextOffset: safeOffset + data.length,
        hasMore: safeOffset + data.length < total,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
export async function getOrders({ userId, status, page = 1, limit = 10 }) {
  try {
    const skip = (page - 1) * limit;

    let where = { userId };

    if (status && status !== "all") {
      const dbStatuses = statusMap[status.toLowerCase()];
      if (dbStatuses && dbStatuses.length) {
        where.status = { in: dbStatuses };
      }
    }

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          orderItems: {
            include: { variation: true, combination: true },
          },
          shipping: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
export async function deleteOrderById(orderId) {
  try {
    // Delete the order by its ID
    const deletedOrder = await prisma.order.delete({
      where: {
        id: orderId,
      },
    });
    revalidatePath("/admin/order");
    revalidateTag("order");
    return {
      success: true,
      data: "Order and associated items deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting order:", error);
    return {
      success: false,
      message: error.message || "Failed to delete order",
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function updateOrderStatusAction(orderId, status, note) {
  try {
    await hasPermission("order", "update");
    if (["REFUNDING", "REFUNDED"].includes(status)) {
      throw new Error("Refund status is managed through MKT refund approval and Accounts disbursement.");
    }
    // 🔎 get order first (for orderNo + old status)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        orderNo: true,
        id: true,
        paymentMethod: true,
        dueAmount: true,
        selectedCourierProviderId: true,
        adminNote: true,
        orderItems: { select: { variationId: true, quantity: true } },
        deliveries: { select: { id: true }, take: 1 },
        shipping: {
          select: { cn: true, cod: true, courierProviderId: true },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Courier delivery is the COD collection event. The posting service is
    // idempotent, so webhook, status polling, and a repeated update cannot
    // credit the courier Money Account more than once.
    const postDeliveredCod = async () => {
      if (status !== "DELIVERED" || order.paymentMethod !== "COD") return null;
      const collectionAmount = Number(
        order.dueAmount ?? order.shipping?.cod ?? 0,
      );
      if (!Number.isFinite(collectionAmount) || collectionAmount <= 0) {
        return null;
      }
      return postCodCollection({
        orderId: order.id,
        courierProviderId:
          order.shipping?.courierProviderId ||
          order.selectedCourierProviderId ||
          undefined,
        amount: collectionAmount,
        reference: order.shipping?.cn || order.orderNo,
        externalEventId: `ORDER_DELIVERED:${order.id}`,
        collectedAt: new Date(),
        createdBy: "courier-delivery",
      });
    };

    // ❌ duplicate same status prevent
    if (order.status === status) {
      await postDeliveredCod();
      return {
        success: true,
        message: "Status already updated",
      };
    }

    // ✅ update order status
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status } });
      const reservedPosMatch = order.adminNote?.match(/^POS_WAREHOUSE:([^:]+):RESERVED$/);
      if (status === "CANCELLED" && reservedPosMatch && order.deliveries.length === 0) {
        const warehouseId = reservedPosMatch[1];
        for (const item of order.orderItems) {
          await tx.stock.updateMany({
            where: {
              warehouseId,
              variationId: item.variationId,
              reserved: { gte: item.quantity },
            },
            data: {
              reserved: { decrement: item.quantity },
              available: { increment: item.quantity },
            },
          });
        }
      }
    });

    // 🧠 dynamic title বানানো
    const titleMap = {
      PENDING: "Order Placed",
      PROCESSING: " Order Comfirmed & Processing for Shipment",
      READY_TO_SHIP: "Ready to Ship",
      SHIPPED: "Order Shipped",
      DELIVERED: "Order Delivered",

      DELIVERY_FAILED: "Delivery Failed",
      FAILED_RETURNING: "Delivery Failed item Returning",
      FAILED_RETURN_RECEIVED: "Delivery Failed item Received",
      CANCELLED: "Order Cancelled",
      RETURNING: "Returning",
      RETURNED: "Returned",
      REFUNDING: "Refund Processing",
      REFUNDED: "Refund Completed",
    };

    // ✅ timeline add
    await addOrderTimeline({
      orderId: order.id,
      orderNo: order.orderNo,
      status,
      title: titleMap[status] || "Status Updated",
      message: note || `Order status changed to ${status}`,
      createdBy: "admin",
    });
    await postDeliveredCod();
    if (status === "PROCESSING") {
      firePurchaseServer({ orderId }).catch((err) =>
        console.error("Tracking failed:", err),
      );
    }

    // 🔄 revalidate
    revalidatePath("/admin/orders");
    revalidatePath("/admin/procurement/stock");
    revalidateTag("order");

    return {
      success: true,
      message: "Order Status Updated",
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: error.message || "Failed to Update order",
    };
  }
}
export async function updateOrderExtraDiscountAction({
  orderId,
  adminNote,
  adminDiscount,
}) {
  try {
    if (!orderId) {
      throw new Error("Order ID is required");
    }
    const checkOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!checkOrder) {
      throw new Error("Order not found");
    }
    const result = await prisma.order.update({
      where: { id: orderId },
      data: {
        adminNote: adminNote,
        adminDiscount: Number(adminDiscount),
      },
    });

    return {
      success: true,
      message: "Order Status Updated",
    };
  } catch (error) {
    console.error("Error updating order:", error);
    return {
      success: false,
      message: error.message || "Failed to Update order",
    };
  }
}

export async function cancelOrderById({
  orderId,
  cancelReason,
  cancelReasonType,
}) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1️⃣ Order + items load
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            select: {
              quantity: true,
              variationId: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // ❗ Already CANCELLED হলে আবার stock add করবে না
      if (order.status === "CANCELLED" || order.status === "RETURNED") {
        throw new Error("Order already CANCELLED/returned");
      }

      // Stock is maintained in the warehouse Stock model and is consumed on delivery.
      // Cancelling an unfulfilled order therefore does not alter inventory.
      await tx.order.update({
        where: { id: orderId },
        data: {
          cancelReason: cancelReason || "",
          cancelReasonType: cancelReasonType || "",
          status: "CANCELLED",
        },
      });

      await addOrderTimeline({
        orderId,
        orderNo: order.orderNo,
        status: "CANCELLED",
        title: cancelReasonType,
        message: cancelReason,

        createdBy: "system",
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error cancelling order:", error);
    return {
      success: false,
      message: error.message || "Failed to cancel order",
    };
  }
}

export async function processRefundAction() {
  return {
    success: false,
    message: "Refunds must be approved in Marketing & Sales and disbursed from Accounts → Refund Disbursement.",
  };
}

export async function getOrderCountsbyUserId(userId) {
  if (!userId) return { all: 0, running: 0, delivered: 0, cancelled: 0, refunded: 0 };
  const allOrders = await prisma.order.groupBy({
    by: ["status"],
    where: { userId },
    _count: { status: true },
  });

  const counts = {
    all: 0,
    running: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  };

  console.log("Grouped order counts:", allOrders);
  allOrders.forEach((o) => {
    counts.all += o._count.status;

    for (const [group, statuses] of Object.entries(CUSTOMER_ORDER_STATUS_GROUPS)) {
      if (group !== "all" && statuses?.includes(o.status)) counts[group] += o._count.status;
    }
  });

  return counts;
}

export async function getOrderIdByOrderNoPhoneNo({ orderNo, phoneNumber }) {
  try {
    if (!orderNo || !phoneNumber) {
      throw new Error(
        "Either orderId or both orderNo and phoneNumber are required",
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        orderNo,
        phoneNumber,
      },
      select: {
        id: true,
        orderNo: true,
        phoneNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        paidAmount: true,
        dueAmount: true,
      },
    });

    if (!order) {
      throw new Error("No order Found");
    }

    return { success: true, data: order }; // Return success with product data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getOrderSuccessPageData({ orderNo, phoneNumber }) {
  if (!orderNo || !phoneNumber) return { success: false };
  const [order, setting] = await Promise.all([
    prisma.order.findFirst({
      where: { orderNo: String(orderNo), phoneNumber: String(phoneNumber) },
      select: { id: true, orderNo: true, status: true, customerConfirmedAt: true, orderItems: { select: { productId: true, product: { select: { categoryId: true } } } } },
    }),
    prisma.siteSetting.findFirst({ select: { orderReconfirmEnabled: true, orderReconfirmMessage: true } }),
  ]);
  if (!order) return { success: false };
  const purchasedIds = [...new Set(order.orderItems.map((item) => item.productId))];
  const categoryIds = [...new Set(order.orderItems.map((item) => item.product?.categoryId).filter(Boolean))];
  const products = await prisma.product.findMany({
    where: { isActive: true, id: { notIn: purchasedIds }, ...(categoryIds.length ? { categoryId: { in: categoryIds } } : {}) },
    take: 8,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, slug: true, hasVariations: true, thumbnail: { select: { name: true } }, category: { select: { name: true } }, variations: { select: { regularPrice: true, discountPrice: true } } },
  });
  return {
    success: true,
    order: { id: order.id, orderNo: order.orderNo, status: order.status, confirmed: Boolean(order.customerConfirmedAt) },
    reconfirm: { enabled: setting?.orderReconfirmEnabled ?? true, message: setting?.orderReconfirmMessage || "অর্ডারটি নিশ্চিত করতে নিচের বাটনে চাপ দিন।" },
    products: products.map((product) => {
      const regularPrices = product.variations.map((item) => Number(item.regularPrice) || 0).filter(Boolean);
      const salePrices = product.variations.map((item) => Number(item.discountPrice) > 0 ? Number(item.discountPrice) : Number(item.regularPrice) || 0).filter(Boolean);
      const regularPrice = regularPrices.length ? Math.min(...regularPrices) : 0;
      const bestSale = salePrices.length ? Math.min(...salePrices) : regularPrice;
      return { id: product.id, title: product.title, slug: product.slug, hasVariations: product.hasVariations, regularPrice, discountPrice: bestSale < regularPrice ? bestSale : 0, thumbnail: { name: product.thumbnail?.name || null }, category: product.category?.name || "" };
    }),
  };
}

export async function reconfirmCustomerOrderAction({ orderNo, phoneNumber }) {
  if (!orderNo || !phoneNumber) return { success: false, message: "অর্ডারের তথ্য পাওয়া যায়নি।" };
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { orderNo: String(orderNo), phoneNumber: String(phoneNumber) }, select: { id: true, status: true, customerConfirmedAt: true } });
      if (!order) return { success: false, message: "অর্ডারটি পাওয়া যায়নি।" };
      if (order.customerConfirmedAt) return { success: true, message: "আপনার অর্ডারটি আগেই re-confirm করা হয়েছে।" };
      if (order.status !== "PENDING") return { success: false, message: "এই অর্ডারটি আর re-confirm করা যাবে না।" };
      const confirmedAt = new Date();
      const changed = await tx.order.updateMany({ where: { id: order.id, status: "PENDING", customerConfirmedAt: null }, data: { customerConfirmedAt: confirmedAt } });
      if (!changed.count) return { success: true, message: "আপনার অর্ডারটি আগেই re-confirm করা হয়েছে।" };
      await tx.orderTimeline.create({ data: { orderId: order.id, orderNo: String(orderNo), status: order.status, title: "Customer re-confirmed order", message: "Customer confirmed this order from the order success page.", createdBy: "customer" } });
      return { success: true, message: "ধন্যবাদ! আপনার অর্ডারটি re-confirm হয়েছে।" };
    });
  } catch {
    return { success: false, message: "এখন re-confirm করা যাচ্ছে না। আবার চেষ্টা করুন।" };
  }
}

export async function cancelUnpaidCustomerOrder({
  orderNo,
  phoneNumber,
  reason,
}) {
  try {
    if (!orderNo || !phoneNumber)
      throw new Error("Order information is required.");
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { orderNo, phoneNumber },
        include: {
          shipping: true,
          payments: { select: { status: true } },
          deliveries: { select: { id: true }, take: 1 },
        },
      });
      if (!order) throw new Error("Order not found.");
      if (order.status === "CANCELLED") return;
      const hasPostedPayment = order.payments.some((payment) =>
        ["PAID", "PARTIALLY_PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(
          payment.status,
        ),
      );
      if (
        order.status !== "PENDING" ||
        (order.paidAmount || 0) > 0 ||
        hasPostedPayment ||
        order.shipping?.cn ||
        order.deliveries.length
      ) {
        throw new Error(
          "This order can no longer be cancelled by the customer.",
        );
      }
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          paymentStatus: "CANCELLED",
          cancelReasonType: "CUSTOMER_CANCELLED",
          cancelReason: String(
            reason || "Cancelled by customer before confirmation",
          ).slice(0, 500),
        },
      });
      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          orderNo: order.orderNo,
          status: "CANCELLED",
          title: "Order Cancelled",
          message: String(
            reason || "Customer cancelled before order confirmation",
          ).slice(0, 500),
          createdBy: "customer",
        },
      });
    });
    revalidatePath("/admin/orders");
    revalidatePath("/tracking");
    return { success: true, message: "Order cancelled successfully." };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Order could not be cancelled.",
    };
  }
}
