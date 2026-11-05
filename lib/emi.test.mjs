import test from "node:test";
import assert from "node:assert/strict";
import { isEmiEligible, normalizeEmiSettings } from "./emi.mjs";

const config = { enabled: true, minimumAmount: 5000, plans: [{ bankName: "Example Bank", tenureMonths: 6, chargePercent: 5, isActive: true }] };

test("eligibility includes the minimum and rejects disabled/missing plans", () => {
  assert.equal(isEmiEligible(config, 5000), true);
  assert.equal(isEmiEligible(config, 4999.99), false);
  assert.equal(isEmiEligible({ ...config, enabled: false }, 10000), false);
  assert.equal(isEmiEligible({ ...config, plans: [] }, 10000), false);
  assert.equal(isEmiEligible({ ...config, plans: [{ isActive: false }] }, 10000), false);
  for (const amount of [NaN, Infinity, -1, 0]) assert.equal(isEmiEligible(config, amount), false);
  assert.equal(isEmiEligible(null, 10000), false);
});

test("validates administrator bank rates and rejects duplicate bank/tenure", () => {
  assert.deepEqual(normalizeEmiSettings(config), config);
  assert.throws(() => normalizeEmiSettings({ ...config, plans: [...config.plans, { ...config.plans[0], bankName: "example bank" }] }), /duplicate/);
  for (const chargePercent of [-1, 101, Infinity, "", null]) assert.throws(() => normalizeEmiSettings({ ...config, plans: [{ ...config.plans[0], chargePercent }] }));
  for (const tenureMonths of [0, 100, 3.5]) assert.throws(() => normalizeEmiSettings({ ...config, plans: [{ ...config.plans[0], tenureMonths }] }));
  assert.throws(() => normalizeEmiSettings({ ...config, minimumAmount: 0 }));
  assert.throws(() => normalizeEmiSettings({ ...config, plans: [] }));
  assert.throws(() => normalizeEmiSettings({ ...config, enabled: "false" }));
});

test("settings can be disabled while preserving rates for later activation", () => {
  const disabled = normalizeEmiSettings({ ...config, enabled: false });
  assert.equal(disabled.plans[0].chargePercent, 5);
  assert.equal(isEmiEligible(disabled, 10000), false);
});
