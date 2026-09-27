import { replaceNumbers } from "@/utils/engToBanNumber";

function numberText(value) {
  return replaceNumbers(Number(value || 0).toLocaleString("en-US"));
}

export function getComboOfferText(campaign, pair) {
  const configuration = campaign.configuration || {};
  const comboType = configuration.comboType || "BUNDLE_FIXED";
  const requiredQuantity = Math.max(1, Number(configuration.requiredQuantity) || 1);
  const rewardQuantity = Math.max(1, Number(configuration.rewardQuantity) || 1);
  let trigger = "যেকোনো পণ্য";
  if (pair.triggerType === "PRODUCT") {
    trigger = (pair.requiredProductNames || []).join(" অথবা ") || "নির্দিষ্ট পণ্য";
  } else if (pair.triggerType === "CATEGORY") {
    trigger = (pair.requiredCategoryNames || []).join(", ") || "নির্বাচিত ক্যাটাগরি";
    trigger += " ক্যাটাগরির পণ্য";
  }
  const reward = (pair.rewardProductNames?.length ? pair.rewardProductNames.join(", ") : pair.rewardProductName) || "পুরস্কার পণ্য";
  let benefit;
  if (comboType === "BUY_X_GET_Y") benefit = `${reward} ফ্রি`;
  else if (comboType === "BUY_X_GET_Y_DISCOUNT") {
    const percent = Number(configuration.rewardDiscountPercent);
    benefit = percent > 0 ? `${reward}-এ ${numberText(percent)}% ছাড়` : `${reward}-এ ${numberText(campaign.discountValue)} ${campaign.discountType === "PERCENT" ? "% ছাড়" : "টাকা ছাড়"}`;
  } else if (comboType === "BUNDLE_PERCENT") benefit = `${reward} সহ কম্বোতে ${numberText(campaign.discountValue)}% ছাড়`;
  else if (comboType === "QUANTITY") benefit = `পরিমাণভিত্তিক ${numberText(campaign.discountValue)} ${campaign.discountType === "PERCENT" ? "% ছাড়" : "টাকা ছাড়"}`;
  else benefit = `${reward} সহ কম্বো মূল্য ৳${numberText(campaign.discountValue)}`;
  const quantityText = requiredQuantity > 1 ? `${numberText(requiredQuantity)}টি ${trigger} কিনলে` : `${trigger} কিনলে`;
  const rewardText = rewardQuantity > 1 ? `${numberText(rewardQuantity)}টি ${benefit}` : benefit;
  return `${quantityText} ${rewardText}`;
}

export function getComboRewardBadge(campaign) {
  const configuration = campaign.configuration || {};
  const comboType = configuration.comboType || "BUNDLE_FIXED";
  if (comboType === "BUY_X_GET_Y") return "FREE";
  if (comboType === "BUY_X_GET_Y_DISCOUNT") {
    const percent = Number(configuration.rewardDiscountPercent);
    if (percent > 0) return `${replaceNumbers(String(percent))}% ছাড়`;
  }
  if (comboType === "BUNDLE_PERCENT") return `${replaceNumbers(String(campaign.discountValue || 0))}% ছাড়`;
  if (comboType === "BUNDLE_FIXED") return "কম্বো";
  if (comboType === "QUANTITY") return campaign.discountType === "PERCENT"
    ? `${replaceNumbers(String(campaign.discountValue || 0))}% ছাড়`
    : `৳${numberText(campaign.discountValue)} ছাড়`;
  if (comboType === "BUY_X_GET_Y_DISCOUNT") {
    if (campaign.discountType === "PERCENT") return `${replaceNumbers(String(campaign.discountValue || 0))}% ছাড়`;
    if (Number(campaign.discountValue) > 0) return `৳${numberText(campaign.discountValue)} ছাড়`;
  }
  return "কম্বো";
}
export function comboPairMatchesProduct(pair, productId, categoryId) {
  if (pair.triggerType === "ALL") return true;
  if (pair.triggerType === "PRODUCT") return (pair.requiredProductIds || []).includes(productId);
  return (pair.requiredCategoryIds || []).includes(categoryId);
}
