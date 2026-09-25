const money = (value) => Math.round(Math.max(0, Number(value) || 0) * 100) / 100;

function matches(campaign, item) {
  const productId = item.productId || item.id;
  if (!campaign.products?.length && !campaign.categories?.length) return true;
  return campaign.products?.includes(productId) ||
    Boolean(item.categoryId && campaign.categories?.includes(item.categoryId));
}

function discountAmount(campaign, base) {
  return campaign.discountType === "PERCENT"
    ? money(base * Math.min(100, Math.max(0, Number(campaign.discountValue) || 0)) / 100)
    : Math.min(base, Number(campaign.discountValue) || 0);
}

function eligibleSubtotal(campaign, items, key = "price") {
  return money(items.reduce((sum, item) => matches(campaign, item)
    ? sum + money(item[key]) * Math.max(0, Number(item.quantity) || 0)
    : sum, 0));
}

function capped(campaign, discount, base) {
  const maximum = campaign.maxDiscountAmount == null ? base : Math.max(0, Number(campaign.maxDiscountAmount) || 0);
  return money(Math.min(base, discount, maximum));
}

function best(campaigns, accepts, getBase) {
  return campaigns.map((campaign) => {
    const base = getBase(campaign);
    return { campaign, base, discount: capped(campaign, discountAmount(campaign, base), base) };
  }).filter(({ campaign, base, discount }) => accepts(campaign, base) && discount > 0)
    .sort((a, b) => b.discount - a.discount)[0] || null;
}

export function calculateCampaignPreviewFallback({ campaigns = [], items = [], deliveryCharge = 0, paymentMethod = null, couponCode = "" }) {
  if (!items.length) return { rows: [], total: 0 };
  const code = String(couponCode).trim().toUpperCase();
  const usable = campaigns.filter((campaign) => campaign.type !== "COUPON" || (code && campaign.couponCode === code));
  const rows = [];
  const pricedItems = items.map((item) => {
    const regular = money(item.regularPrice);
    const sale = money(item.discountPrice);
    const basePrice = sale > 0 && sale < regular ? sale : (sale > 0 && !regular ? sale : regular || sale);
    const offer = best(usable, (campaign) => campaign.type === "PRODUCT_DISCOUNT" && matches(campaign, item), () => basePrice);
    if (offer) rows.push({ id: offer.campaign.id, name: offer.campaign.name, discount: offer.discount * (Number(item.quantity) || 1), startAt: offer.campaign.startAt, endAt: offer.campaign.endAt });
    return { ...item, basePrice, price: offer ? money(basePrice - offer.discount) : basePrice };
  });
  const productTotal = money(pricedItems.reduce((sum, item) => sum + item.price * (Number(item.quantity) || 1), 0));
  const cart = best(usable,
    (campaign, base) => ["CART_DISCOUNT", "COUPON"].includes(campaign.type) && base >= money(campaign.minimumOrderAmount),
    (campaign) => eligibleSubtotal(campaign, pricedItems, campaign.discountBase === "PRODUCT_SUBTOTAL" ? "basePrice" : "price"));
  const afterCart = money(productTotal - (cart?.discount || 0));
  if (cart) rows.push({ id: cart.campaign.id, name: cart.campaign.name, discount: cart.discount, startAt: cart.campaign.startAt, endAt: cart.campaign.endAt });

  const payment = paymentMethod ? best(usable, (campaign, base) => {
    if (campaign.type !== "PAYMENT_DISCOUNT" || base < money(campaign.minimumOrderAmount)) return false;
    const scope = campaign.configuration?.paymentScope;
    if (scope === "COD") return paymentMethod === "COD";
    if (scope === "ONLINE") return paymentMethod !== "COD" && (!campaign.paymentMethods?.length || campaign.paymentMethods.includes(paymentMethod));
    return !(campaign.paymentMethods?.length || campaign.paymentMethod) || campaign.paymentMethods?.includes(paymentMethod) || campaign.paymentMethod === paymentMethod;
  }, (campaign) => eligibleSubtotal(campaign, pricedItems)) : null;
  const afterPayment = money(afterCart - (payment?.discount || 0));
  if (payment) rows.push({ id: payment.campaign.id, name: payment.campaign.name, discount: payment.discount, startAt: payment.campaign.startAt, endAt: payment.campaign.endAt });

  const delivery = usable.map((campaign) => ({
    campaign,
    base: eligibleSubtotal(campaign, pricedItems),
    discount: capped(campaign, discountAmount(campaign, deliveryCharge), deliveryCharge),
  })).filter(({ campaign, base, discount }) =>
    ["DELIVERY", "DELIVERY_DISCOUNT"].includes(campaign.type) &&
    base >= money(campaign.minimumOrderAmount) &&
    (!(campaign.paymentMethods?.length || campaign.paymentMethod) || campaign.paymentMethods?.includes(paymentMethod) || campaign.paymentMethod === paymentMethod) &&
    discount > 0
  ).sort((a, b) => b.discount - a.discount)[0] || null;
  if (delivery) rows.push({ id: delivery.campaign.id, name: delivery.campaign.name, discount: delivery.discount, startAt: delivery.campaign.startAt, endAt: delivery.campaign.endAt });

  return {
    rows: rows.map((row) => ({ ...row, discount: money(row.discount) })),
    total: money(afterPayment + deliveryCharge - (delivery?.discount || 0)),
  };
}
