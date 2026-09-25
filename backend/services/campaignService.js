import prisma from "@/lib/prisma";

const money = (value) => Math.round(Math.max(0, Number(value) || 0) * 100) / 100;

export function campaignBasePrice(variation) {
  const regular = money(variation?.regularPrice);
  const discounted = money(variation?.discountPrice);
  return discounted > 0 && discounted < regular ? discounted : regular;
}

function isWithinSchedule(campaign, now = new Date()) {
  return (
    campaign.status === "PUBLISHED" &&
    (!campaign.startAt || campaign.startAt <= now) &&
    (!campaign.endAt || campaign.endAt >= now)
  );
}

function targetsProduct(campaign, productId, categoryId) {
  if (!campaign.products?.length && !campaign.categories?.length) return true;
  return Boolean(
    campaign.products?.some((item) => item.productId === productId) ||
      campaign.categories?.some((item) => item.categoryId === categoryId),
  );
}

function eligibleSubtotal(campaign, items = [], priceKey = "price") {
  if (!items.length) return null;
  return money(items.reduce((sum, item) =>
    targetsProduct(campaign, item.productId, item.categoryId)
      ? sum + money(item[priceKey]) * Math.max(0, Number(item.quantity) || 0)
      : sum, 0));
}

function discountAmount(campaign, basePrice) {
  if (campaign.discountType === "PERCENT") {
    return money((basePrice * Math.min(100, Math.max(0, campaign.discountValue || 0))) / 100);
  }
  return money(Math.min(basePrice, campaign.discountValue || 0));
}

export async function getActiveCampaigns({ couponCode } = {}) {
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "PUBLISHED",
      AND: [
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ...(couponCode ? [{ OR: [{ couponCode: null }, { couponCode: String(couponCode).trim().toUpperCase() }] }] : [{ couponCode: null }]),
      ],
    },
    include: { products: true, categories: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  const normalizedCode = couponCode ? String(couponCode).trim().toUpperCase() : null;
  return campaigns.filter((campaign) =>
    isWithinSchedule(campaign, now) &&
    (campaign.type !== "COUPON" || (normalizedCode && campaign.couponCode === normalizedCode)),
  );
}

export async function getPublicCampaigns() {
  const now = new Date();
  return prisma.campaign.findMany({
    where: {
      status: "PUBLISHED",
      AND: [
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    select: {
      id: true,
      name: true,
      description: true,
      bannerUrl: true,
      group: true,
      type: true,
      startAt: true,
      endAt: true,
      minimumOrderAmount: true,
      couponCode: true,
      priority: true,
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function getPublicCampaignProducts(campaignId, page = 1, pageSize = 40) {
  if (!/^[a-f\d]{24}$/i.test(String(campaignId || ""))) return null;
  const now = new Date();
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { products: true, categories: true },
  });
  if (!campaign || campaign.status !== "PUBLISHED" || (campaign.endAt && campaign.endAt < now)) return null;

  const configuration = campaign.configuration || {};
  const pairs = Array.isArray(configuration.productPairs) ? configuration.productPairs : [];
  const productIds = new Set(campaign.products.map((item) => item.productId));
  const categoryIds = new Set(campaign.categories.map((item) => item.categoryId));
  let includesAllProducts = campaign.group !== "COMBO" && !campaign.products.length && !campaign.categories.length;

  for (const pair of pairs) {
    for (const id of [
      ...(pair.requiredProductIds || (pair.requiredProductId ? [pair.requiredProductId] : [])),
      ...(pair.rewardProductIds || (pair.rewardProductId ? [pair.rewardProductId] : [])),
    ]) if (id) productIds.add(id);
    for (const id of pair.requiredCategoryIds || (pair.requiredCategoryId ? [pair.requiredCategoryId] : [])) {
      if (id) categoryIds.add(id);
    }
    if (pair.triggerType === "ALL") includesAllProducts = true;
  }
  for (const id of [
    ...(configuration.requiredProductIds || []),
    ...(configuration.rewardProductIds || []),
  ]) if (id) productIds.add(id);

  if (categoryIds.size) {
    const categories = await prisma.category.findMany({ select: { id: true, parentCategoryId: true } });
    let changed = true;
    while (changed) {
      changed = false;
      for (const category of categories) {
        if (category.parentCategoryId && categoryIds.has(category.parentCategoryId) && !categoryIds.has(category.id)) {
          categoryIds.add(category.id);
          changed = true;
        }
      }
    }
  }

  const targetFilters = [];
  if (productIds.size) targetFilters.push({ id: { in: [...productIds] } });
  if (categoryIds.size) targetFilters.push({ categoryId: { in: [...categoryIds] } });
  if (includesAllProducts || !targetFilters.length && campaign.group !== "COMBO") {
    // Untargeted non-combo campaigns apply to every product.
  } else if (!targetFilters.length) {
    return { campaign, products: [], total: 0, page: 1, pageSize, totalPages: 0 };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const where = {
    isActive: true,
    ...(includesAllProducts || !targetFilters.length && campaign.group !== "COMBO" ? {} : { OR: targetFilters }),
  };
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ title: "asc" }, { id: "asc" }],
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        categoryId: true,
        hasVariations: true,
        thumbnail: { select: { name: true } },
        variations: { select: { regularPrice: true, discountPrice: true } },
        category: { select: { name: true } },
      },
    }),
  ]);
  const cards = products.map((product) => {
    const variations = product.variations || [];
    const regularPrices = variations.map((variation) => Number(variation.regularPrice)).filter(Number.isFinite);
    const salePrices = variations.map((variation) => Number(variation.discountPrice ?? variation.regularPrice)).filter(Number.isFinite);
    const regularPrice = regularPrices.length ? Math.min(...regularPrices) : 0;
    let discountPrice = salePrices.length ? Math.min(...salePrices) : 0;
    if (discountPrice >= regularPrice) discountPrice = 0;
    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      hasVariations: product.hasVariations,
      regularPrice,
      discountPrice,
      thumbnail: { name: product.thumbnail?.name || null },
      category: product.category?.name || "Uncategorized",
      ...getProductCardCampaignData({ campaigns: [campaign], productId: product.id, categoryId: product.categoryId, regularPrice, discountPrice }),
    };
  });
  return { campaign, products: cards, total, page: safePage, pageSize, totalPages: Math.ceil(total / pageSize) };
}
// Product campaigns always start from the product's effective selling price:
// valid discountPrice first, otherwise regularPrice.
export function applyProductCampaign({ campaigns, productId, categoryId, basePrice }) {
  const eligible = campaigns.filter(
    (campaign) =>
      campaign.type === "PRODUCT_DISCOUNT" &&
      targetsProduct(campaign, productId, categoryId),
  );
  const best = eligible
    .map((campaign) => ({ campaign, amount: discountAmount(campaign, basePrice) }))
    .sort((left, right) => right.amount - left.amount)[0];
  if (!best || best.amount <= 0) return { price: money(basePrice), discount: 0, campaign: null };
  return {
    price: money(basePrice - best.amount),
    discount: best.amount,
    campaign: best.campaign,
  };
}

// Product-card labels are display-only; checkout still recalculates eligibility
// and the final discount from the customer's cart and selected payment method.
export function getProductCardCampaignData({
  campaigns = [],
  productId,
  categoryId,
  regularPrice,
  discountPrice,
}) {
  const basePrice = campaignBasePrice({ regularPrice, discountPrice });
  const productOffer = applyProductCampaign({
    campaigns,
    productId,
    categoryId,
    basePrice,
  });
  const campaignDiscountPercent = productOffer.campaign && basePrice > 0
    ? Math.round((productOffer.discount / basePrice) * 100)
    : 0;

  const deliveryCampaign = campaigns.find((campaign) => {
    if (!["DELIVERY", "DELIVERY_DISCOUNT"].includes(campaign.type)) return false;
    const offerType = campaign.configuration?.offerType;
    const isFreeDelivery = offerType === "FREE" ||
      (campaign.discountType === "PERCENT" && Number(campaign.discountValue) >= 100);
    if (!isFreeDelivery) return false;
    const matchesTarget =
      (!campaign.products?.length && !campaign.categories?.length) ||
      campaign.products?.some((target) => target.productId === productId) ||
      campaign.categories?.some((target) => target.categoryId === categoryId);
    return matchesTarget;
  });

  return {
    campaignPrice: productOffer.campaign ? productOffer.price : null,
    campaignDiscountPercent,
    deliveryCampaignLabel: deliveryCampaign
      ? Number(deliveryCampaign.minimumOrderAmount) > 0
        ? `Free delivery from ৳${Number(deliveryCampaign.minimumOrderAmount).toLocaleString()}`
        : deliveryCampaign.configuration?.offerType === "ONLINE_PAYMENT"
          ? "Free delivery on online payment"
          : "Free delivery"
      : null,
  };
}

export function applyCartCampaign({ campaigns, subtotal, items = [] }) {
  const eligible = campaigns.map((campaign) => {
    const base = eligibleSubtotal(campaign, items, campaign.discountBase === "PRODUCT_SUBTOTAL" ? "basePrice" : "price");
    return { campaign, base: base ?? money(subtotal) };
  }).filter(({ campaign, base }) => ["CART_DISCOUNT", "COUPON"].includes(campaign.type) && base >= money(campaign.minimumOrderAmount));
  const best = eligible.map(({ campaign, base }) => ({ campaign, discount: discountAmount(campaign, base) })).sort((a, b) => b.discount - a.discount)[0];
  if (!best || best.discount <= 0) return { subtotal: money(subtotal), discount: 0, campaign: null };
  const discount = Math.min(money(subtotal), best.discount, campaignMax(best.campaign, subtotal));
  return { subtotal: money(subtotal - discount), discount, campaign: best.campaign };
}

export function applyPaymentCampaign({ campaigns, subtotal, paymentMethod, items = [] }) {
  const eligible = campaigns.map((campaign) => {
    const base = eligibleSubtotal(campaign, items) ?? money(subtotal);
    return { campaign, base };
  }).filter(({ campaign, base }) => {
    if (campaign.type !== "PAYMENT_DISCOUNT" || base < money(campaign.minimumOrderAmount)) return false;
    const scope = campaign.configuration?.paymentScope;
    if (scope === "COD") return paymentMethod === "COD";
    if (scope === "ONLINE") return paymentMethod !== "COD" && (!campaign.paymentMethods?.length || campaign.paymentMethods.includes(paymentMethod));
    return !(campaign.paymentMethods?.length || campaign.paymentMethod) || campaign.paymentMethods?.includes(paymentMethod) || campaign.paymentMethod === paymentMethod;
  });
  const best = eligible.map(({ campaign, base }) => ({ campaign, discount: discountAmount(campaign, base) })).sort((a, b) => b.discount - a.discount)[0];
  if (!best || best.discount <= 0) return { subtotal: money(subtotal), discount: 0, campaign: null };
  const discount = Math.min(money(subtotal), best.discount, campaignMax(best.campaign, subtotal));
  return { subtotal: money(subtotal - discount), discount, campaign: best.campaign };
}

export function applyDeliveryCampaign({ campaigns, subtotal, paymentMethod, deliveryCharge, items = [] }) {
  const eligible = campaigns.map((campaign) => ({ campaign, base: eligibleSubtotal(campaign, items) ?? money(subtotal) })).filter(
    ({ campaign, base }) =>
      ["DELIVERY", "DELIVERY_DISCOUNT"].includes(campaign.type) &&
      base >= money(campaign.minimumOrderAmount) &&
      (!(campaign.paymentMethods?.length || campaign.paymentMethod) || campaign.paymentMethods?.includes(paymentMethod) || campaign.paymentMethod === paymentMethod),
  );
  const best = eligible
    .map(({ campaign }) => ({
      campaign,
      discount:
        campaign.discountType === "PERCENT"
          ? money((deliveryCharge * Math.min(100, Math.max(0, campaign.discountValue || 0))) / 100)
          : money(Math.min(deliveryCharge, campaign.discountValue || 0)),
    }))
    .sort((left, right) => right.discount - left.discount)[0];
  if (!best || best.discount <= 0) return { deliveryCharge: money(deliveryCharge), discount: 0, campaign: null };
  const cappedDiscount = Math.min(money(deliveryCharge), best.discount, campaignMax(best.campaign, deliveryCharge));
  return {
    deliveryCharge: money(deliveryCharge - cappedDiscount),
    discount: cappedDiscount,
    campaign: best.campaign,
  };
}

function campaignMax(campaign, amount) {
  return campaign.maxDiscountAmount == null ? amount : Math.max(0, Math.min(amount, money(campaign.maxDiscountAmount)));
}
export function toCampaignDisplayData(campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description || "",
    group: campaign.group || campaign.type,
    type: campaign.type,
    discountType: campaign.discountType,
    discountValue: Number(campaign.discountValue) || 0,
    minimumOrderAmount: Number(campaign.minimumOrderAmount) || 0,
    maxDiscountAmount: campaign.maxDiscountAmount == null ? null : Number(campaign.maxDiscountAmount),
    startAt: campaign.startAt?.toISOString?.() || null,
    endAt: campaign.endAt?.toISOString?.() || null,
    couponCode: campaign.couponCode || null,
    configuration: campaign.configuration || {},
    paymentMethods: campaign.paymentMethods || [],
    products: (campaign.products || []).map(({ productId }) => productId),
    categories: (campaign.categories || []).map(({ categoryId }) => categoryId),
  };
}

export async function getCheckoutCampaignOffers() {
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "PUBLISHED",
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    include: { products: true, categories: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  return campaigns.map(toCampaignDisplayData);
}
