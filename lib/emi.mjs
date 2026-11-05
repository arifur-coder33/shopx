export function isEmiEligible(configuration, amount) {
  return Boolean(configuration?.enabled && Number.isFinite(Number(amount)) && Number(amount) > 0
    && Number(configuration.minimumAmount) > 0 && Number(amount) >= Number(configuration.minimumAmount)
    && configuration.plans?.some((plan) => plan.isActive !== false));
}

export function normalizeEmiSettings(input) {
  if (!input || typeof input.enabled !== "boolean") throw new Error("Choose a valid EMI enabled status.");
  const minimumAmount = Number(input.minimumAmount);
  if (!Number.isFinite(minimumAmount) || minimumAmount < 0 || minimumAmount > 1e9 || (input.enabled && minimumAmount <= 0)) throw new Error("Set a valid EMI minimum amount greater than zero when enabled.");
  if (!Array.isArray(input.plans) || input.plans.length > 200) throw new Error("Add at most 200 bank plans.");
  const keys = new Set();
  const plans = input.plans.map((plan) => {
    const bankName = String(plan.bankName || "").trim();
    const tenureMonths = Number(plan.tenureMonths);
    const chargePercent = Number(plan.chargePercent);
    if (!bankName || bankName.length > 100 || !Number.isInteger(tenureMonths) || tenureMonths < 1 || tenureMonths > 99
      || plan.chargePercent === "" || plan.chargePercent == null || !Number.isFinite(chargePercent) || chargePercent < 0 || chargePercent > 100) throw new Error("Each bank plan needs a bank name, 1–99 months and a total charge from 0–100%.");
    const key = `${bankName.toLowerCase()}:${tenureMonths}`;
    if (keys.has(key)) throw new Error("A bank cannot have duplicate plans for the same tenure.");
    keys.add(key);
    return { bankName, tenureMonths, chargePercent, isActive: plan.isActive !== false };
  });
  if (input.enabled && !plans.some((plan) => plan.isActive)) throw new Error("Add at least one active bank plan before enabling EMI.");
  return { enabled: input.enabled === true, minimumAmount, plans };
}
