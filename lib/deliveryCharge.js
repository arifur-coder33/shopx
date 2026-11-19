export const DEFAULT_DELIVERY_RATES = {
  insideDhakaCharge: 100,
  outsideDhakaCharge: 120,
  additionalKgCharge: 20,
  providerName: "Manual Delivery",
};

export const nonNegativeRate = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

export function calculateDeliveryCharge(deliveryArea, weight, rates = DEFAULT_DELIVERY_RATES) {
  const baseCharge = deliveryArea === "inside-dhaka"
    ? nonNegativeRate(rates.insideDhakaCharge, DEFAULT_DELIVERY_RATES.insideDhakaCharge)
    : nonNegativeRate(rates.outsideDhakaCharge, DEFAULT_DELIVERY_RATES.outsideDhakaCharge);
  const totalWeight = Math.max(0, Number(weight) || 0);
  const additionalKg = Math.max(0, Math.ceil(totalWeight) - 1);
  return Math.round((baseCharge + additionalKg * nonNegativeRate(rates.additionalKgCharge, DEFAULT_DELIVERY_RATES.additionalKgCharge)) * 100) / 100;
}

// The shipment pays one base fee. A scoped offer credits the standalone fee
// for the eligible group, up to the amount still due on the shipment.
export function campaignDeliveryBase({ campaign, items, matches, deliveryCharge, area, rates, previous }) {
  if (!campaign.products?.length && !campaign.categories?.length) return deliveryCharge;
  const eligible = items.filter((item) => Number(item.quantity) > 0 && matches(campaign, item));
  if (!eligible.length) return 0;
  const weight = eligible.reduce((sum, item) =>
    sum + Math.max(0, Number(item.weight) || 0) * Number(item.quantity), 0);
  const eligibleCharge = calculateDeliveryCharge(area, weight, rates);
  const overlaps = previous?.campaign && eligible.some((item) => matches(previous.campaign, item));
  return Math.min(deliveryCharge, Math.max(0, eligibleCharge - (overlaps ? previous.discount : 0)));
}
