export function resolveComboRewards(campaigns = [], products = [], dismissedIds = [], variationSelections = {}) {
  const purchased = (products || []).filter((item) => !item.comboReward && !item.isComboReward);
  const qualified = (campaigns || []).filter((campaign) => {
    if (campaign.type !== "COMBO" && campaign.group !== "COMBO") return false;
    if (dismissedIds.includes(campaign.id)) return false;
    return (campaign.configuration?.productPairs || []).some((pair) => {
      const requiredQty = Math.max(1, Number(campaign.configuration?.requiredQuantity) || 1);
      const qualifying = purchased.filter((item) => {
        if (pair.triggerType === "ALL") return true;
        if (pair.triggerType === "PRODUCT") return (pair.requiredProductIds || (pair.requiredProductId ? [pair.requiredProductId] : [])).includes(item.productId || item.id);
        return (pair.requiredCategoryIds || (pair.requiredCategoryId ? [pair.requiredCategoryId] : [])).includes(item.categoryId);
      });
      return qualifying.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) >= requiredQty;
    });
  }).sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
  const selected = qualified.length && qualified[0].stackable === true && qualified[0].exclusive !== true
    ? qualified.filter((campaign) => campaign.stackable === true && campaign.exclusive !== true)
    : qualified.slice(0, 1);
  const groups = selected.map((campaign) => {
    const pairs = (campaign.configuration?.productPairs || []).filter((pair) => {
      const requiredQty = Math.max(1, Number(campaign.configuration?.requiredQuantity) || 1);
      const qualifying = purchased.filter((item) => pair.triggerType === "ALL" || (pair.triggerType === "PRODUCT"
        ? (pair.requiredProductIds || (pair.requiredProductId ? [pair.requiredProductId] : [])).includes(item.productId || item.id)
        : (pair.requiredCategoryIds || (pair.requiredCategoryId ? [pair.requiredCategoryId] : [])).includes(item.categoryId)));
      return qualifying.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) >= requiredQty;
    });
    const rewardItems = pairs.flatMap((pair) => (pair.rewardProducts || []).filter((reward) => reward.variation?.id).map((reward) => {
      const variation = (reward.variations || []).find((item) => item.id === variationSelections[`${campaign.id}:${reward.id}`]) || reward.variation;
      if (!variation?.id) return null;
      const regularPrice = Number(variation.regularPrice) || Number(reward.regularPrice) || Number(reward.price) || 0;
      const salePrice = Number(variation.discountPrice) || 0;
      const basePrice = salePrice > 0 && salePrice < regularPrice ? salePrice : regularPrice;
      const comboType = campaign.configuration?.comboType || "BUNDLE_FIXED";
      const pct = comboType === "BUY_X_GET_Y" ? 100
        : comboType === "BUY_X_GET_Y_DISCOUNT" ? Number(campaign.configuration?.rewardDiscountPercent || 0)
          : comboType === "BUNDLE_PERCENT" ? Number(campaign.discountValue || 0)
            : comboType === "QUANTITY" && campaign.discountType === "PERCENT" ? Number(campaign.discountValue || 0) : 0;
      const fixed = comboType === "QUANTITY" && campaign.discountType !== "PERCENT" ? Number(campaign.discountValue || 0) : 0;
      let unitPrice = Math.max(0, Math.round((basePrice * (1 - Math.min(100, pct) / 100) - fixed) * 100) / 100);
      if (comboType === "BUNDLE_FIXED") {
        const triggerSubtotal = purchased.filter((item) => pair.triggerType === "ALL" || (pair.triggerType === "PRODUCT"
          ? (pair.requiredProductIds || (pair.requiredProductId ? [pair.requiredProductId] : [])).includes(item.productId || item.id)
          : (pair.requiredCategoryIds || (pair.requiredCategoryId ? [pair.requiredCategoryId] : [])).includes(item.categoryId))
        ).reduce((sum, item) => sum + Math.max(0, Number(item.discountPrice || item.price || item.regularPrice) || 0) * (Number(item.quantity) || 1), 0);
        const rewardCount = (pair.rewardProducts || []).length * Math.max(1, Number(campaign.configuration?.rewardQuantity) || 1);
        unitPrice = Math.max(0, Math.round((Number(campaign.discountValue || 0) - triggerSubtotal) / Math.max(1, rewardCount) * 100) / 100);
      }
      return {
        id: `${campaign.id}:${reward.id}`, productId: reward.id, title: reward.name, slug: reward.slug,
        thumbnail: variation.thumbnail || reward.thumbnail, regularPrice,
        discountPrice: unitPrice, price: unitPrice, quantity: Math.max(1, Number(campaign.configuration?.rewardQuantity) || 1),
        weight: Number(variation.weight) || 0, sku: variation.sku,
        variation, variationOptions: reward.variations || [], comboReward: true, comboCampaignId: campaign.id,
        comboCampaignName: campaign.name,
      };
    }));
    return { campaign, pairs, rewardItems };
  }).filter((group) => group.rewardItems.length > 0);
  return { groups, items: groups.flatMap((group) => group.rewardItems) };
}
