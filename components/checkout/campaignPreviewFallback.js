import { getCampaignRuleText } from "@/components/campaign/campaignRuleText";
import { campaignDeliveryBase } from "@/lib/deliveryCharge";

const money = (value) => Math.round(Math.max(0, Number(value) || 0) * 100) / 100;

function matches(campaign, item) {
  const productId = item.productId || item.id;
  if (!campaign.products?.length && !campaign.categories?.length) return true;
  return campaign.products?.includes(productId) ||
    Boolean(item.categoryId && campaign.categories?.includes(item.categoryId));
}

function discountAmount(campaign, base) {
  if (["DELIVERY", "DELIVERY_DISCOUNT"].includes(campaign.type) && campaign.configuration?.offerType === "FREE") return base;
  const specialPrice = Number(campaign.specialPrice);
  if (campaign.type === "PRODUCT_DISCOUNT" && campaign.specialPrice != null && Number.isFinite(specialPrice)) {
    return money(Math.max(0, base - Math.max(0, specialPrice)));
  }
  return campaign.discountType === "PERCENT"
    ? money(base * Math.min(100, Math.max(0, Number(campaign.discountValue) || 0)) / 100)
    : Math.min(base, Number(campaign.discountValue) || 0);
}

function hasEligibleItems(campaign, items) {
  if (!campaign.products?.length && !campaign.categories?.length) return items.length > 0;
  return items.some((item) => matches(campaign, item) && Number(item.quantity) > 0);
}

function eligibleSubtotal(campaign, items, key = "price") {
  return money(items.reduce((sum, item) => matches(campaign, item)
    ? sum + money(item[key]) * Math.max(0, Number(item.quantity) || 0)
    : sum, 0));
}

function capped(campaign, discount, base) {
  const configuredMaximum = Number(campaign.maxDiscountAmount);
  const maximum = campaign.maxDiscountAmount == null || !Number.isFinite(configuredMaximum) || configuredMaximum <= 0
    ? base
    : configuredMaximum;
  return money(Math.min(base, discount, maximum));
}

function compatibleCampaigns(campaigns, selectedCampaigns) {
  if (!selectedCampaigns.length) return campaigns;
  const selectedIds = new Set(selectedCampaigns.map((campaign) => campaign.id));
  const canStack = selectedCampaigns.every((campaign) => campaign.stackable === true && campaign.exclusive !== true);
  return campaigns.filter((campaign) => selectedIds.has(campaign.id) || (canStack && campaign.stackable === true && campaign.exclusive !== true));
}

function campaignPaymentMatches(campaign, paymentMethod) {
  if (campaign.configuration?.paymentScope === "COD") return paymentMethod === "COD";
  if (campaign.configuration?.paymentScope === "ONLINE" || campaign.configuration?.offerType === "ONLINE_PAYMENT") return Boolean(paymentMethod) && paymentMethod !== "COD" && (!campaign.paymentMethods?.length || campaign.paymentMethods.includes(paymentMethod));
  return !(campaign.paymentMethods?.length || campaign.paymentMethod) || campaign.paymentMethods?.includes(paymentMethod) || campaign.paymentMethod === paymentMethod;
}

function selectCampaignsByPriority(campaigns, items, paymentMethod) {
  const eligible = campaigns.map((campaign) => {
    const hasItems = hasEligibleItems(campaign, items);
    const base = eligibleSubtotal(campaign, items, campaign.discountBase === "PRODUCT_SUBTOTAL" ? "basePrice" : "price");
    let reward = 0;
    let applies = false;
    if (campaign.type === "PRODUCT_DISCOUNT") {
      const offers = items.filter((item) => matches(campaign, item));
      reward = Math.max(0, ...offers.map((item) => capped(campaign, discountAmount(campaign, item.price ?? item.basePrice), item.price ?? item.basePrice))) * Math.max(1, ...offers.map((item) => Math.max(1, Number(item.quantity) || 1)));
      applies = offers.length > 0 && reward > 0;
    } else if (["CART_DISCOUNT", "COUPON"].includes(campaign.type)) {
      applies = hasItems && base >= money(campaign.minimumOrderAmount);
      reward = capped(campaign, discountAmount(campaign, base), base);
    } else if (campaign.type === "PAYMENT_DISCOUNT") {
      applies = hasItems && Boolean(paymentMethod) && campaignPaymentMatches(campaign, paymentMethod) && base >= money(campaign.minimumOrderAmount);
      reward = campaign.configuration?.paymentDiscountTarget === "DELIVERY" ? Number(campaign.discountValue) || 0 : capped(campaign, discountAmount(campaign, base), base);
    } else if (["DELIVERY", "DELIVERY_DISCOUNT"].includes(campaign.type)) {
      applies = hasItems && base >= money(campaign.minimumOrderAmount) && campaignPaymentMatches(campaign, paymentMethod);
      reward = campaign.configuration?.offerType === "FREE" ? 100 : Number(campaign.discountValue) || 0;
    }
    return { campaign, applies: applies && reward > 0, reward };
  }).filter((entry) => entry.applies)
    .sort((a, b) => (Number(b.campaign.priority) || 0) - (Number(a.campaign.priority) || 0) || b.reward - a.reward);
  if (!eligible.length) return [];
  const top = eligible[0].campaign;
  return top.stackable === true && top.exclusive !== true
    ? eligible.map(({ campaign }) => campaign).filter((campaign) => campaign.stackable === true && campaign.exclusive !== true)
    : [top];
}

function best(campaigns, accepts, getBase) {
  return campaigns.map((campaign) => {
    const base = getBase(campaign);
    return { campaign, base, discount: capped(campaign, discountAmount(campaign, base), base) };
  }).filter(({ campaign, base, discount }) => accepts(campaign, base) && discount > 0)
    .sort((a, b) => (Number(b.campaign.priority) || 0) - (Number(a.campaign.priority) || 0) || b.discount - a.discount)[0] || null;
}

export function calculateCampaignPreviewFallback({ campaigns = [], items = [], deliveryCharge = 0, deliveryArea, deliveryRates, paymentMethod = null, couponCode = "" }) {
  if (!items.length) return { rows: [], total: 0 };
  const code = String(couponCode).trim().toUpperCase();
  const usable = campaigns.filter((campaign) => campaign.type !== "COUPON" || (code && campaign.couponCode === code));
  const rows = [];
  const itemDiscounts = [];
  const priorityItems = items.map((item) => { const regular = money(item.regularPrice); const sale = money(item.discountPrice); const price = sale > 0 && sale < regular ? sale : (sale > 0 && !regular ? sale : regular || sale); return { ...item, productId: item.productId || item.id, basePrice: price, price }; });
  const prioritizedCampaigns = selectCampaignsByPriority(usable, priorityItems, paymentMethod);
  const selectedCampaigns = new Map();
  const compatible = () => compatibleCampaigns(prioritizedCampaigns, [...selectedCampaigns.values()]);
  const remember = (campaign) => { if (campaign) selectedCampaigns.set(campaign.id, campaign); };
  const pricedItems = items.map((item) => {
    const regular = money(item.regularPrice);
    const sale = money(item.discountPrice);
    const basePrice = sale > 0 && sale < regular ? sale : (sale > 0 && !regular ? sale : regular || sale);
    const offer = best(compatible(), (campaign) => campaign.type === "PRODUCT_DISCOUNT" && matches(campaign, item), () => basePrice);
    if (offer) { remember(offer.campaign); itemDiscounts.push({ variationId: item.variation?.id || item.variationId, productId: item.productId || item.id, name: offer.campaign.name, ruleText: getCampaignRuleText(offer.campaign), discount: offer.discount, startAt: offer.campaign.startAt, endAt: offer.campaign.endAt }); }
    return { ...item, weight: item.weight ?? item.variation?.weight, basePrice, price: offer ? money(basePrice - offer.discount) : basePrice };
  });
  const productTotal = money(pricedItems.reduce((sum, item) => sum + item.price * (Number(item.quantity) || 1), 0));
  const cart = best(compatible(),
    (campaign, base) => ["CART_DISCOUNT", "COUPON"].includes(campaign.type) && base >= money(campaign.minimumOrderAmount),
    (campaign) => eligibleSubtotal(campaign, pricedItems, campaign.discountBase === "PRODUCT_SUBTOTAL" ? "basePrice" : "price"));
  remember(cart?.campaign);
  const afterCart = money(productTotal - (cart?.discount || 0));
  if (cart) rows.push({ id: cart.campaign.id, name: cart.campaign.name, ruleText: getCampaignRuleText(cart.campaign), discount: cart.discount, startAt: cart.campaign.startAt, endAt: cart.campaign.endAt });

  const payment = paymentMethod ? best(compatible(), (campaign, base) => {
    if (campaign.type !== "PAYMENT_DISCOUNT" || campaign.configuration?.paymentDiscountTarget === "DELIVERY" || base < money(campaign.minimumOrderAmount)) return false;
    const scope = campaign.configuration?.paymentScope;
    if (scope === "COD") return paymentMethod === "COD";
    if (scope === "ONLINE") return paymentMethod !== "COD" && (!campaign.paymentMethods?.length || campaign.paymentMethods.includes(paymentMethod));
    return !(campaign.paymentMethods?.length || campaign.paymentMethod) || campaign.paymentMethods?.includes(paymentMethod) || campaign.paymentMethod === paymentMethod;
  }, (campaign) => eligibleSubtotal(campaign, pricedItems)) : null;
  remember(payment?.campaign);
  const afterPayment = money(afterCart - (payment?.discount || 0));
  if (payment) rows.push({ id: payment.campaign.id, name: payment.campaign.name, ruleText: getCampaignRuleText(payment.campaign), discount: payment.discount, startAt: payment.campaign.startAt, endAt: payment.campaign.endAt });

  const deliveryBase = (campaign, charge, previous) => campaignDeliveryBase({
    campaign, items: pricedItems, matches, deliveryCharge: charge, area: deliveryArea, rates: deliveryRates, previous,
  });
  const delivery = best(compatible(), (campaign) =>
    ["DELIVERY", "DELIVERY_DISCOUNT"].includes(campaign.type) &&
    hasEligibleItems(campaign, pricedItems) &&
    eligibleSubtotal(campaign, pricedItems) >= money(campaign.minimumOrderAmount) &&
    campaignPaymentMatches(campaign, paymentMethod),
  (campaign) => deliveryBase(campaign, deliveryCharge));
  remember(delivery?.campaign);
  if (delivery) rows.push({ id: delivery.campaign.id, name: delivery.campaign.name, ruleText: getCampaignRuleText(delivery.campaign), discount: delivery.discount, startAt: delivery.campaign.startAt, endAt: delivery.campaign.endAt });

  const beforePaymentDelivery = money(deliveryCharge - (delivery?.discount || 0));
  const paymentDelivery = compatible().map((campaign) => {
    const orderBase = eligibleSubtotal(campaign, pricedItems);
    const scope = campaign.configuration?.paymentScope;
    const methodMatches = Boolean(paymentMethod) && (scope === "COD" ? paymentMethod === "COD"
      : scope === "ONLINE" ? paymentMethod !== "COD" && (!campaign.paymentMethods?.length || campaign.paymentMethods.includes(paymentMethod))
        : !(campaign.paymentMethods?.length || campaign.paymentMethod) || campaign.paymentMethods?.includes(paymentMethod) || campaign.paymentMethod === paymentMethod);
    const base = deliveryBase(campaign, beforePaymentDelivery, delivery);
    const discount = capped(campaign, discountAmount(campaign, base), base);
    return { campaign, orderBase, discount, methodMatches };
  }).filter(({ campaign, orderBase, discount, methodMatches }) =>
    campaign.type === "PAYMENT_DISCOUNT" && campaign.configuration?.paymentDiscountTarget === "DELIVERY" &&
    hasEligibleItems(campaign, pricedItems) && orderBase >= money(campaign.minimumOrderAmount) && methodMatches && discount > 0
  ).sort((a, b) => (Number(b.campaign.priority) || 0) - (Number(a.campaign.priority) || 0) || b.discount - a.discount)[0] || null;
  remember(paymentDelivery?.campaign);
  const finalDeliveryCharge = money(beforePaymentDelivery - (paymentDelivery?.discount || 0));
  if (paymentDelivery) rows.push({ id: paymentDelivery.campaign.id, name: paymentDelivery.campaign.name, ruleText: getCampaignRuleText(paymentDelivery.campaign), discount: paymentDelivery.discount, startAt: paymentDelivery.campaign.startAt, endAt: paymentDelivery.campaign.endAt });

  const appliedIds = new Set(rows.map((row) => row.id));
  const progressCampaigns = compatibleCampaigns(usable, [...selectedCampaigns.values()]);
  const progress = progressCampaigns
    .filter((campaign) => ["CART_DISCOUNT", "COUPON", "DELIVERY", "DELIVERY_DISCOUNT"].includes(campaign.type) || (campaign.type === "PAYMENT_DISCOUNT" && campaign.configuration?.paymentDiscountTarget === "DELIVERY"))
    .filter((campaign) => !appliedIds.has(campaign.id))
    .filter((campaign) => hasEligibleItems(campaign, pricedItems))
    .map((campaign) => {
      const target = money(campaign.minimumOrderAmount);
      const baseKey = campaign.type === "CART_DISCOUNT" && campaign.discountBase === "PRODUCT_SUBTOTAL" ? "basePrice" : "price";
      const current = eligibleSubtotal(campaign, pricedItems, baseKey);
      const remaining = money(target - current);
      if (target <= 0 || remaining <= 0) return null;
      const deliveryOffer = ["DELIVERY", "DELIVERY_DISCOUNT"].includes(campaign.type) || (campaign.type === "PAYMENT_DISCOUNT" && campaign.configuration?.paymentDiscountTarget === "DELIVERY");
      const isFreeDelivery = deliveryOffer && (campaign.configuration?.offerType === "FREE" ||
        (campaign.discountType === "PERCENT" && Number(campaign.discountValue) >= 100));
      const reward = isFreeDelivery
        ? "ফ্রি ডেলিভারি"
        : campaign.discountType === "PERCENT"
          ? `${Number(campaign.discountValue) || 0}% ছাড়`
          : `৳${Number(campaign.discountValue || 0).toLocaleString("en-US")} ছাড়`;
      const prefix = campaign.type === "PAYMENT_DISCOUNT" && campaign.configuration?.paymentScope === "ONLINE" ? "অনলাইন পেমেন্টে " : campaign.configuration?.offerType === "ONLINE_PAYMENT" ? "অনলাইন পেমেন্টে " : "";
      const purchaseTarget = campaign.products?.length || campaign.categories?.length ? "যোগ্য পণ্য" : "পণ্য";
      return {
        id: campaign.id,
        name: campaign.name,
        current,
        target,
        remaining,
        percent: Math.min(100, Math.max(0, (current / target) * 100)),
        message: `আর ৳${remaining.toLocaleString("en-US")} টাকার ${purchaseTarget} কিনলেই ${prefix}${reward}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.remaining - b.remaining);

  return {
    rows: rows.map((row) => ({ ...row, discount: money(row.discount) })),
    itemDiscounts,
    progress,
    originalDeliveryCharge: deliveryCharge,
    deliveryCharge: finalDeliveryCharge,
    total: money(afterPayment + finalDeliveryCharge),
  };
}
