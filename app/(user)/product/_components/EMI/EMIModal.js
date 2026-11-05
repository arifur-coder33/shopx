"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/modal/Modal";
import { isEmiEligible } from "@/lib/emi.mjs";

export default function EMIModal({ price, configuration, onClose }) {
  const banks = useMemo(() => {
    const grouped = new Map();
    for (const plan of configuration?.plans || []) {
      if (plan.isActive === false) continue;
      const key = plan.bankName.toLowerCase();
      if (!grouped.has(key)) grouped.set(key, { key, name: plan.bankName, plans: [] });
      grouped.get(key).plans.push(plan);
    }
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [configuration]);
  const [selectedKey, setSelectedKey] = useState(banks[0]?.key);
  const [amount, setAmount] = useState(price);
  const bank = banks.find((item) => item.key === selectedKey) || banks[0];
  const eligible = isEmiEligible(configuration, amount);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);
  return <Modal isOpen onClose={onClose}>
    <h2 className="pr-12 text-lg font-bold">EMI plans</h2>
    <div className="mt-4 flex max-h-[70dvh] min-h-0 flex-col gap-4 overflow-auto sm:flex-row">
      <nav aria-label="EMI banks" className="flex shrink-0 gap-2 overflow-auto sm:w-48 sm:flex-col">
        {banks.map((item) => <button type="button" key={item.key} onClick={() => setSelectedKey(item.key)} aria-pressed={item.key === bank?.key} className={`shrink-0 rounded-lg border p-3 text-left text-sm ${item.key === bank?.key ? "border-primary bg-primary-soft" : "border-border"}`}>{item.name}</button>)}
      </nav>
      <div className="min-w-0 flex-1 space-y-3">
        <label className="grid gap-1 text-sm">Amount (৳)
          <input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2" />
        </label>
        <p className="text-xs text-text-muted">EMI eligible from ৳{Number(configuration.minimumAmount).toLocaleString("en-BD")}</p>
        {!eligible ? <p className="text-sm text-text-muted">এই amount EMI-এর জন্য প্রযোজ্য নয়।</p> : <div className="overflow-x-auto"><table className="w-full min-w-[400px] text-sm">
          <thead><tr className="text-left"><th className="p-2">Months</th><th className="p-2">Monthly estimate</th><th className="p-2">Total charge</th><th className="p-2">Estimated total</th></tr></thead>
          <tbody>{[...(bank?.plans || [])].sort((a, b) => a.tenureMonths - b.tenureMonths).map((plan) => {
            const total = Number(amount) * (1 + Number(plan.chargePercent) / 100);
            return <tr key={plan.tenureMonths} className="border-t border-border"><td className="p-2">{plan.tenureMonths}</td><td className="p-2">৳{(total / plan.tenureMonths).toFixed(2)}</td><td className="p-2">{plan.chargePercent}%</td><td className="p-2">৳{total.toFixed(2)}</td></tr>;
          })}</tbody>
        </table></div>}
        <p className="text-xs text-text-muted">এটি আনুমানিক হিসাব। চূড়ান্ত eligibility, charge ও কিস্তি SSLCommerz checkout এবং কার্ড ইস্যুকারী ব্যাংক নির্ধারণ করবে।</p>
      </div>
    </div>
  </Modal>;
}
