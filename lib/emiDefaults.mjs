const standardRates = { 3: 3.09, 6: 4.71, 9: 6.95, 12: 9.29, 18: 12.99, 24: 18.34, 30: 19.76, 36: 24.22 };

const legacyBanks = [
  ["Standard Chartered Bank", [3, 6, 9, 12, 18, 24, 36]],
  ["City Bank Limited", [3, 6, 9, 12, 18, 24, 30, 36]],
  ["Eastern Bank Limited", [3, 6, 9, 12, 18, 24, 30, 36]],
  ["BRAC Bank Limited", [3, 6, 9, 12, 18, 24]],
  ["Dutch Bangla Bank Limited", [3, 6, 9, 12, 18, 24, 36]],
  ["Mutual Trust Bank Limited", [3, 6, 9, 12, 18, 24, 36]],
  ["Southeast Bank Limited", [3, 6, 9, 12, 18, 24, 30, 36]],
  ["Standard Bank Limited", [3, 6, 9, 12, 18, 24]],
  ["NCC Bank Limited", [3, 6, 9, 12, 18, 24, 36]],
  ["NRB Bank Limited", [3, 6, 9, 12, 18, 24, 36]],
  ["Meghna Bank Limited", [3, 6, 9, 12, 18, 24]],
  ["Jamuna Bank Limited", [3, 6, 9, 12, 18, 24, 36]],
  ["Midland Bank Limited", [3, 6, 9, 12, 18, 24]],
  ["Bank Asia Limited", [3, 6, 9, 12]],
  ["Dhaka Bank Limited", [3, 6, 9, 12]],
  ["SBAC Bank", [3, 6, 9, 12, 18, 24]],
  ["LankaBangla Financial Limited", [3, 6, 9, 12, 18, 24]],
  ["NRB Commercial Bank", [3, 6, 9, 12, 18, 24]],
  ["Shahjalal Islami Bank Limited (SJIBL)", [3, 6, 9, 12]],
  ["United Commercial Bank (UCB)", [3, 6, 9, 12, 24]],
  ["Exim Bank", [3, 6, 9, 12, 18, 24]],
  ["Prime Bank Limited", [3, 6, 9, 12, 18, 24]],
  ["Al-Arafah Islami Bank Limited", [3, 6, 9, 12]],
  ["Community Bank Bangladesh Limited", [3, 6, 9, 12, 18, 24, 36]],
  ["One Bank Limited", [3, 6, 9, 12]],
  ["Trust Bank Limited", [3, 6, 9, 12, 18, 24, 36]],
  ["Mercantile Bank Limited", [3, 6, 9, 12, 18, 24, 30, 36]],
  ["Premier Bank", [3, 6, 9, 12]],
  ["AB Bank Limited", [3, 6, 9, 12]],
];

const bankSpecificRates = {
  "Standard Chartered Bank": { 3: 3.63, 6: 5.82, 9: 8.7, 12: 11.73, 18: 15.61, 24: 21.21, 36: 29.03 },
  "AB Bank Limited": { 3: 4.16, 6: 6.38, 9: 7.52, 12: 8.69 },
};

export const DEFAULT_EMI_MINIMUM_AMOUNT = 132000;
export const DEFAULT_EMI_PLANS = legacyBanks.flatMap(([bankName, tenures]) => {
  const rates = bankSpecificRates[bankName] || standardRates;
  return tenures.map((tenureMonths) => ({ bankName, tenureMonths, chargePercent: rates[tenureMonths], isActive: true }));
});
