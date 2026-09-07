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
