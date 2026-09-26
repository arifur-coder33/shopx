function amountText(campaign) {
  if (campaign.type === "PRODUCT_DISCOUNT" && campaign.specialPrice != null) {
    return `বিশেষ মূল্য ৳${Number(campaign.specialPrice).toLocaleString("en-US")}`;
  }
  if (["DELIVERY", "DELIVERY_DISCOUNT"].includes(campaign.type) &&
      (campaign.configuration?.offerType === "FREE" || (campaign.discountType === "PERCENT" && Number(campaign.discountValue) >= 100))) {
    return "ফ্রি ডেলিভারি (১০০% ছাড়)";
  }
  if (campaign.type === "PAYMENT_DISCOUNT" && campaign.configuration?.paymentDiscountTarget === "DELIVERY" && campaign.discountType === "PERCENT" && Number(campaign.discountValue) >= 100) {
    return "১০০% ছাড় (ফ্রি ডেলিভারি)";
  }
  const value = Number(campaign.discountValue) || 0;
  return campaign.discountType === "PERCENT"
    ? `${value}% ছাড়`
    : `৳${value.toLocaleString("en-US")} ছাড়`;
}

export function getCampaignRuleText(campaign = {}) {
  const type = campaign.type || campaign.group;
  const productTargets = campaign.products || [];
  const categoryTargets = campaign.categories || [];
  let scope = "বিশেষ ছাড়";

  if (type === "PRODUCT_DISCOUNT") {
    scope = productTargets.length || Number(campaign.targetProductCount) > 0
      ? "নির্বাচিত পণ্যে"
      : categoryTargets.length || Number(campaign.targetCategoryCount) > 0
        ? "নির্বাচিত ক্যাটাগরিতে"
        : "সকল পণ্যে";
  } else if (type === "CART_DISCOUNT" || type === "COUPON") {
    scope = "অর্ডারে";
  } else if (["DELIVERY", "DELIVERY_DISCOUNT"].includes(type)) {
    scope = "ডেলিভারি চার্জে";
  } else if (type === "PAYMENT_DISCOUNT") {
    const paymentScope = campaign.configuration?.paymentScope;
    const paymentText = paymentScope === "COD" ? "COD পেমেন্টে" : paymentScope === "ONLINE" ? "অনলাইন পেমেন্টে" : "পেমেন্টে";
    scope = campaign.configuration?.paymentDiscountTarget === "DELIVERY" ? `${paymentText} ডেলিভারি চার্জে` : paymentText;
  } else if (type === "COMBO") {
    scope = "কম্বো অফারে";
  }

  const conditions = [`${scope} ${amountText(campaign)}`];
  const minimumOrder = Number(campaign.minimumOrderAmount) || 0;
  if (minimumOrder > 0) conditions.push(`৳${minimumOrder.toLocaleString("en-US")} ন্যূনতম কেনাকাটায়`);
  const minimumQuantity = Number(campaign.minimumQuantity) || 0;
  if (minimumQuantity > 1) conditions.push(`কমপক্ষে ${minimumQuantity}টি কিনলে`);
  if (Number(campaign.maxDiscountAmount) > 0) conditions.push(`সর্বোচ্চ ৳${Number(campaign.maxDiscountAmount).toLocaleString("en-US")} ছাড়`);
  if (type === "PAYMENT_DISCOUNT" && campaign.paymentMethods?.length) {
    conditions.push(campaign.paymentMethods.join(", "));
  }
  return conditions.join(" · ");
}
