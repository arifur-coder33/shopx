import prisma from "@/lib/prisma";
import { getComboRewardBadge, comboPairMatchesProduct } from "@/components/campaign/comboOfferText";

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

function hasEligibleItems(campaign, items = []) {
  if (!campaign.products?.length && !campaign.categories?.length) return items.length > 0;
  return items.some((item) => targetsProduct(campaign, item.productId, item.categoryId) && Number(item.quantity) > 0);
}

function eligibleSubtotal(campaign, items = [], priceKey = "price") {
  if (!items.length) return null;
  return money(items.reduce((sum, item) =>
    targetsProduct(campaign, item.productId, item.categoryId)
      ? sum + money(item[priceKey]) * Math.max(0, Number(item.quantity) || 0)
      : sum, 0));
}

function discountAmount(campaign, basePrice) {
  const specialPrice = Number(campaign.specialPrice);
  if (campaign.type === "PRODUCT_DISCOUNT" && campaign.specialPrice != null && Number.isFinite(specialPrice)) {
    return money(Math.max(0, basePrice - Math.max(0, specialPrice)));
  }
  if (campaign.discountType === "PERCENT") {
    return money((basePrice * Math.min(100, Math.max(0, campaign.discountValue || 0))) / 100);
  }
  return money(Math.min(basePrice, campaign.discountValue || 0));
}

async function withComboDisplayNames(campaigns) {
  const comboCampaigns = campaigns.filter((campaign) => campaign.type === "COMBO" || campaign.group === "COMBO");
  const pairs = comboCampaigns.flatMap((campaign) => campaign.configuration?.productPairs || []);
  const productIds = [...new Set(pairs.flatMap((pair) => [ ...(pair.requiredProductIds || (pair.requiredProductId ? [pair.requiredProductId] : [])), ...(pair.rewardProductIds?.length ? pair.rewardProductIds : (pair.rewardProductId ? [pair.rewardProductId] : [])) ].filter(Boolean)))];
  const categoryIds = [...new Set(pairs.flatMap((pair) => pair.requiredCategoryIds || (pair.requiredCategoryId ? [pair.requiredCategoryId] : [])))];
  if (!productIds.length && !categoryIds.length) return campaigns;
  const [products, categories] = await Promise.all([
    productIds.length ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, title: true, slug: true, thumbnail: { select: { name: true } }, variations: { select: { id: true, sku: true, regularPrice: true, discountPrice: true, weight: true, thumbnail: { select: { name: true } }, combinations: { include: { variationName: { select: { name: true } }, variationValue: { select: { value: true } } } } } } } }) : [],
    categoryIds.length ? prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } }) : [],
  ]);
  const productNames = new Map(products.map((product) => [product.id, product.title]));
  const productThumbnails = new Map(products.map((product) => [product.id, product.thumbnail?.name || null]));
  const productMap = new Map(products.map((product) => [product.id, product]));
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  return campaigns.map((campaign) => {
    if (campaign.type !== "COMBO" && campaign.group !== "COMBO") return campaign;
    const configuration = campaign.configuration || {};
    return { ...campaign, configuration: { ...configuration, productPairs: (configuration.productPairs || []).map((pair) => ({
      ...pair,
      requiredProductNames: (pair.requiredProductIds || (pair.requiredProductId ? [pair.requiredProductId] : [])).map((id) => productNames.get(id)).filter(Boolean),
      requiredCategoryNames: (pair.requiredCategoryIds || (pair.requiredCategoryId ? [pair.requiredCategoryId] : [])).map((id) => categoryNames.get(id)).filter(Boolean),
      rewardProductIds: pair.rewardProductIds?.length ? pair.rewardProductIds : (pair.rewardProductId ? [pair.rewardProductId] : []),
      rewardProductNames: (pair.rewardProductIds?.length ? pair.rewardProductIds : (pair.rewardProductId ? [pair.rewardProductId] : [])).map((id) => productNames.get(id)).filter(Boolean),
      rewardProducts: (pair.rewardProductIds?.length ? pair.rewardProductIds : (pair.rewardProductId ? [pair.rewardProductId] : [])).map((id) => { const product = productMap.get(id); const prices = (product?.variations || []).map((variation) => ({ regular: Number(variation.regularPrice) || 0, sale: Number(variation.discountPrice) || 0 })).map(({ regular, sale }) => sale > 0 && sale < regular ? sale : regular).filter((price) => price > 0); const regularPrices = (product?.variations || []).map((variation) => Number(variation.regularPrice) || 0).filter((price) => price > 0); const sorted = [...(product?.variations || [])].sort((a, b) => { const price = (v) => { const regular = Number(v.regularPrice) || 0; const sale = Number(v.discountPrice) || 0; return sale > 0 && sale < regular ? sale : regular; }; return price(a) - price(b); }); const variation = sorted.find((item) => Number(item.regularPrice) > 0); const regular = Number(variation?.regularPrice) || 0; const sale = Number(variation?.discountPrice) || 0; return { id, name: product?.title || "Reward product", slug: product?.slug || "", thumbnail: variation?.thumbnail?.name || product?.thumbnail?.name || null, price: sale > 0 && sale < regular ? sale : (regular || null), regularPrice: regular || null, variation: variation ? { id: variation.id, sku: variation.sku, weight: variation.weight, regularPrice: variation.regularPrice, discountPrice: variation.discountPrice, thumbnail: variation.thumbnail?.name || product?.thumbnail?.name || null, combinations: variation.combinations } : null, variations: sorted.map((item) => ({ id: item.id, sku: item.sku, weight: item.weight, regularPrice: item.regularPrice, discountPrice: item.discountPrice, thumbnail: item.thumbnail?.name || product?.thumbnail?.name || null, combinations: item.combinations })) }; }),
      rewardProductName: productNames.get((pair.rewardProductIds?.length ? pair.rewardProductIds : (pair.rewardProductId ? [pair.rewardProductId] : []))[0]) || "",
      rewardProductThumbnail: productThumbnails.get((pair.rewardProductIds?.length ? pair.rewardProductIds : (pair.rewardProductId ? [pair.rewardProductId] : []))[0]) || null,
    })) } };
  });
}
export async function getActiveCampaigns({ couponCode, includeComboDisplayNames = true } = {}) {
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
  const activeCampaigns = campaigns.filter((campaign) =>
    isWithinSchedule(campaign, now) &&
    (campaign.type !== "COUPON" || (normalizedCode && campaign.couponCode === normalizedCode))
  );
  return includeComboDisplayNames ? withComboDisplayNames(activeCampaigns) : activeCampaigns;
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
      minimumQuantity: true,
      maxDiscountAmount: true,
      specialPrice: true,
      discountType: true,
      discountValue: true,
      configuration: true,
      paymentMethods: true,
      couponCode: true,
      priority: true,
      _count: { select: { products: true, categories: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function getPublicCampaignProducts(campaignId, page = 1, pageSize = 40) {
  if (!/^[a-f\d]{24}$/i.test(String(campaignId || ""))) return null;
  const now = new Date();
  let campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { products: true, categories: true },
  });
  if (!campaign || campaign.status !== "PUBLISHED" || (campaign.endAt && campaign.endAt < now)) return null;
  [campaign] = await withComboDisplayNames([campaign]);

  const configuration = campaign.configuration || {};
  const pairs = Array.isArray(configuration.productPairs) ? configuration.productPairs : [];
  const productIds = new Set(campaign.products.map((item) => item.productId));
  const categoryIds = new Set(campaign.categories.map((item) => item.categoryId));
  let includesAllProducts = campaign.group !== "COMBO" && !campaign.products.length && !campaign.categories.length;

  for (const pair of pairs) {
    for (const id of [
      ...(pair.requiredProductIds || (pair.requiredProductId ? [pair.requiredProductId] : [])),
      ...(pair.rewardProductIds?.length ? pair.rewardProductIds : (pair.rewardProductId ? [pair.rewardProductId] : [])),
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
        variations: { select: { id: true, sku: true, regularPrice: true, discountPrice: true, weight: true, thumbnail: { select: { name: true } }, combinations: { include: { variationName: { select: { name: true } }, variationValue: { select: { value: true } } } } } },
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
    .map((campaign) => ({ campaign, amount: campaignMax(campaign, discountAmount(campaign, basePrice)) }))
    .sort((left, right) => (Number(right.campaign.priority) || 0) - (Number(left.campaign.priority) || 0) || right.amount - left.amount)[0];
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
  const comboOffers = campaigns
    .filter((campaign) => campaign.type === "COMBO" || campaign.group === "COMBO")
    .flatMap((campaign) => (campaign.configuration?.productPairs || [])
      .filter((pair) => comboPairMatchesProduct(pair, productId, categoryId))
      .map((pair) => ({ id: `${campaign.id}-${pair.rewardProductIds?.[0] || pair.rewardProductId}`, badge: getComboRewardBadge(campaign), rewardProductName: pair.rewardProductName || "Reward product", rewardProductThumbnail: pair.rewardProductThumbnail || null, rewardProducts: pair.rewardProducts || [] })));
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
    comboOffers,
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
  const best = eligible.map(({ campaign, base }) => ({ campaign, discount: discountAmount(campaign, base) })).sort((a, b) => (Number(b.campaign.priority) || 0) - (Number(a.campaign.priority) || 0) || b.discount - a.discount)[0];
  if (!best || best.discount <= 0) return { subtotal: money(subtotal), discount: 0, campaign: null };
  const discount = Math.min(money(subtotal), best.discount, campaignMax(best.campaign, subtotal));
  return { subtotal: money(subtotal - discount), discount, campaign: best.campaign };
}

export function applyPaymentCampaign({ campaigns, subtotal, paymentMethod, items = [] }) {
  if (!paymentMethod) return { subtotal: money(subtotal), discount: 0, campaign: null };
  const eligible = campaigns.map((campaign) => {
    const base = eligibleSubtotal(campaign, items) ?? money(subtotal);
    return { campaign, base };
  }).filter(({ campaign, base }) => {
    if (campaign.type !== "PAYMENT_DISCOUNT" || campaign.configuration?.paymentDiscountTarget === "DELIVERY" || !hasEligibleItems(campaign, items) || base < money(campaign.minimumOrderAmount)) return false;
    const scope = campaign.configuration?.paymentScope;
    if (scope === "COD") return paymentMethod === "COD";
    if (scope === "ONLINE") return paymentMethod !== "COD" && (!campaign.paymentMethods?.length || campaign.paymentMethods.includes(paymentMethod));
    return !(campaign.paymentMethods?.length || campaign.paymentMethod) || campaign.paymentMethods?.includes(paymentMethod) || campaign.paymentMethod === paymentMethod;
  });
  const best = eligible.map(({ campaign, base }) => ({ campaign, discount: discountAmount(campaign, base) })).sort((a, b) => (Number(b.campaign.priority) || 0) - (Number(a.campaign.priority) || 0) || b.discount - a.discount)[0];
  if (!best || best.discount <= 0) return { subtotal: money(subtotal), discount: 0, campaign: null };
  const discount = Math.min(money(subtotal), best.discount, campaignMax(best.campaign, subtotal));
  return { subtotal: money(subtotal - discount), discount, campaign: best.campaign };
}

export function applyPaymentDeliveryCampaign({ campaigns, subtotal, paymentMethod, deliveryCharge, items = [] }) {
  if (!paymentMethod) return { deliveryCharge: money(deliveryCharge), discount: 0, campaign: null };
  const eligible = campaigns.map((campaign) => ({ campaign, base: eligibleSubtotal(campaign, items) ?? money(subtotal) })).filter(({ campaign, base }) => {
    if (campaign.type !== "PAYMENT_DISCOUNT" || campaign.configuration?.paymentDiscountTarget !== "DELIVERY" || !hasEligibleItems(campaign, items) || base < money(campaign.minimumOrderAmount)) return false;
    const scope = campaign.configuration?.paymentScope;
    if (scope === "COD") return paymentMethod === "COD";
    if (scope === "ONLINE") return paymentMethod !== "COD" && (!campaign.paymentMethods?.length || campaign.paymentMethods.includes(paymentMethod));
    return !(campaign.paymentMethods?.length || campaign.paymentMethod) || campaign.paymentMethods?.includes(paymentMethod) || campaign.paymentMethod === paymentMethod;
  });
  const best = eligible.map(({ campaign }) => ({ campaign, discount: discountAmount(campaign, deliveryCharge) }))
    .sort((a, b) => (Number(b.campaign.priority) || 0) - (Number(a.campaign.priority) || 0) || b.discount - a.discount)[0];
  if (!best || best.discount <= 0) return { deliveryCharge: money(deliveryCharge), discount: 0, campaign: null };
  const discount = Math.min(money(deliveryCharge), best.discount, campaignMax(best.campaign, deliveryCharge));
  return { deliveryCharge: money(deliveryCharge - discount), discount, campaign: best.campaign };
}

export function applyDeliveryCampaign({ campaigns, subtotal, paymentMethod, deliveryCharge, items = [] }) {
  const eligible = campaigns.map((campaign) => ({ campaign, base: eligibleSubtotal(campaign, items) ?? money(subtotal) })).filter(
    ({ campaign, base }) =>
      ["DELIVERY", "DELIVERY_DISCOUNT"].includes(campaign.type) &&
      hasEligibleItems(campaign, items) &&
      base >= money(campaign.minimumOrderAmount) &&
      ((campaign.configuration?.offerType !== "ONLINE_PAYMENT" && campaign.configuration?.paymentScope !== "ONLINE") || (Boolean(paymentMethod) && paymentMethod !== "COD")) &&
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
    .sort((left, right) => (Number(right.campaign.priority) || 0) - (Number(left.campaign.priority) || 0) || right.discount - left.discount)[0];
  if (!best || best.discount <= 0) return { deliveryCharge: money(deliveryCharge), discount: 0, campaign: null };
  const cappedDiscount = Math.min(money(deliveryCharge), best.discount, campaignMax(best.campaign, deliveryCharge));
  return {
    deliveryCharge: money(deliveryCharge - cappedDiscount),
    discount: cappedDiscount,
    campaign: best.campaign,
  };
}

function campaignPaymentMatches(campaign, paymentMethod) {
  if (campaign.configuration?.paymentScope === "COD") return paymentMethod === "COD";
  if (campaign.configuration?.paymentScope === "ONLINE" || campaign.configuration?.offerType === "ONLINE_PAYMENT") {
    return Boolean(paymentMethod) && paymentMethod !== "COD" && (!campaign.paymentMethods?.length || campaign.paymentMethods.includes(paymentMethod));
  }
  return !(campaign.paymentMethods?.length || campaign.paymentMethod) || campaign.paymentMethods?.includes(paymentMethod) || campaign.paymentMethod === paymentMethod;
}

export function selectCampaignsByPriority({ campaigns = [], items = [], paymentMethod = null }) {
  const eligible = campaigns.map((campaign) => {
    const base = eligibleSubtotal(campaign, items, campaign.discountBase === "PRODUCT_SUBTOTAL" ? "basePrice" : "price") ?? 0;
    const hasItems = hasEligibleItems(campaign, items);
    let reward = 0;
    let applies = false;
    if (campaign.type === "PRODUCT_DISCOUNT") {
      const offers = items.filter((item) => targetsProduct(campaign, item.productId, item.categoryId));
      reward = Math.max(0, ...offers.map((item) => campaignMax(campaign, discountAmount(campaign, money(item.price ?? item.basePrice)))))
        * Math.max(1, ...offers.map((item) => Math.max(1, Number(item.quantity) || 1)));
      applies = offers.length > 0 && reward > 0;
    } else if (["CART_DISCOUNT", "COUPON"].includes(campaign.type)) {
      applies = hasItems && base >= money(campaign.minimumOrderAmount);
      reward = campaignMax(campaign, discountAmount(campaign, base));
    } else if (campaign.type === "PAYMENT_DISCOUNT") {
      applies = hasItems && Boolean(paymentMethod) && campaignPaymentMatches(campaign, paymentMethod) &&
        base >= money(campaign.minimumOrderAmount);
      reward = campaign.configuration?.paymentDiscountTarget === "DELIVERY"
        ? Math.max(0, Number(campaign.discountValue) || 0)
        : campaignMax(campaign, discountAmount(campaign, base));
    } else if (["DELIVERY", "DELIVERY_DISCOUNT"].includes(campaign.type)) {
      applies = hasItems && base >= money(campaign.minimumOrderAmount) && campaignPaymentMatches(campaign, paymentMethod);
      reward = campaign.discountType === "PERCENT" ? Number(campaign.discountValue) || 0 : Number(campaign.discountValue) || 0;
    }
    return { campaign, applies: applies && reward > 0, reward };
  }).filter((candidate) => candidate.applies)
    .sort((a, b) => (Number(b.campaign.priority) || 0) - (Number(a.campaign.priority) || 0) || b.reward - a.reward);
  if (!eligible.length) return [];
  const top = eligible[0].campaign;
  return top.stackable === true && top.exclusive !== true
    ? eligible.map(({ campaign }) => campaign).filter((campaign) => campaign.stackable === true && campaign.exclusive !== true)
    : [top];
}

function campaignMax(campaign, amount) {
  const maxDiscountAmount = Number(campaign.maxDiscountAmount);
  // Older campaign forms stored an empty optional cap as 0. Treat that legacy
  // value as unset so those product discounts still apply.
  return campaign.maxDiscountAmount == null || !Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0
    ? amount
    : Math.max(0, Math.min(amount, money(maxDiscountAmount)));
}
export function toCampaignDisplayData(campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description || "",
    group: campaign.group || campaign.type,
    type: campaign.type,
    stackable: campaign.stackable === true,
    exclusive: campaign.exclusive === true,
    priority: Number(campaign.priority) || 0,
    discountType: campaign.discountType,
    discountValue: Number(campaign.discountValue) || 0,
    specialPrice: campaign.specialPrice == null ? null : Number(campaign.specialPrice),
    minimumOrderAmount: Number(campaign.minimumOrderAmount) || 0,
    minimumQuantity: campaign.minimumQuantity == null ? null : Number(campaign.minimumQuantity),
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
  return (await withComboDisplayNames(campaigns)).map(toCampaignDisplayData);
}
