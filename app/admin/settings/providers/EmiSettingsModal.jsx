"use client";

import { useEffect, useState, useTransition } from "react";
import { getProviderEmiSettings, saveProviderEmiSettings } from "@/backend/serverActions/emiActions";
import Modal from "@/components/modal/Modal";
import { toast } from "react-toastify";

const field = "w-full rounded-lg border border-border bg-surface px-3 py-2";

export default function EmiSettingsModal({ provider, onClose, onSaved }) {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    let active = true;
    getProviderEmiSettings(provider.id).then((result) => {
      if (!active) return;
      if (result.success) setSettings(result.data);
      else setError(result.message);
    }).catch(() => active && setError("Could not load EMI settings."));
    return () => { active = false; };
  }, [provider.id]);
  const updatePlan = (index, patch) => setSettings((current) => ({ ...current, plans: current.plans.map((plan, position) => position === index ? { ...plan, ...patch } : plan) }));
  const submit = (event) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveProviderEmiSettings(provider.id, settings);
      if (!result.success) return toast.error(result.message);
      toast.success(result.message);
      onSaved();
      onClose();
    });
  };
  return <Modal isOpen onClose={onClose}>
    <div className="max-h-[80dvh] overflow-auto pr-2">
      <h2 className="pr-12 text-xl font-bold">{provider.name} · EMI settings</h2>
      {error && <p className="mt-4 text-danger" role="alert">{error}</p>}
      {!settings && !error && <p className="mt-4">Loading settings…</p>}
      {settings && <form onSubmit={submit} className="mt-5 space-y-5">
        <fieldset disabled={pending} className="space-y-5 disabled:opacity-60">
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} /> Enable EMI</label>
          {!provider.isActive && <p className="text-sm text-text-muted">Enable the SSLCommerz payment provider as well to offer EMI to customers.</p>}
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Default bank, tenure ও rate আগের EMI list থেকে seed করা হয়েছে। EMI চালু করার আগে আপনার বর্তমান SSLCommerz merchant agreement অনুযায়ী rates যাচাই করে নিন।</p>
          <label className="grid max-w-sm gap-1 text-sm font-semibold">Minimum payable amount (৳, inclusive)
            <input type="number" min={settings.enabled ? "0.01" : "0"} max="1000000000" step="0.01" required value={settings.minimumAmount} onChange={(event) => setSettings({ ...settings, minimumAmount: event.target.value })} className={field} />
          </label>
          <p className="text-sm text-text-muted">Rates are total charges for each tenure, not annual interest. Match your bank/SSLCommerz agreement. These estimates do not change charges on the hosted payment page.</p>
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left"><th className="p-2">Bank</th><th className="p-2">Months</th><th className="p-2">Total charge (%)</th><th className="p-2">Active</th><th /></tr></thead>
            <tbody>{settings.plans.map((plan, index) => <tr key={plan.id}>
              <td className="p-2"><input aria-label="Bank name" required maxLength={100} value={plan.bankName} onChange={(event) => updatePlan(index, { bankName: event.target.value })} className={field} /></td>
              <td className="p-2"><input aria-label="Tenure in months" required type="number" min="1" max="99" value={plan.tenureMonths} onChange={(event) => updatePlan(index, { tenureMonths: event.target.value })} className={field} /></td>
              <td className="p-2"><input aria-label="Total charge percent" required type="number" min="0" max="100" step="0.01" value={plan.chargePercent} onChange={(event) => updatePlan(index, { chargePercent: event.target.value })} className={field} /></td>
              <td className="p-2"><input aria-label="Plan active" type="checkbox" checked={plan.isActive} onChange={(event) => updatePlan(index, { isActive: event.target.checked })} /></td>
              <td className="p-2"><button type="button" className="text-danger" onClick={() => setSettings({ ...settings, plans: settings.plans.filter((_, position) => position !== index) })}>Remove</button></td>
            </tr>)}</tbody>
          </table></div>
          <button type="button" className="button" disabled={settings.plans.length >= 200} onClick={() => setSettings({ ...settings, plans: [...settings.plans, { id: crypto.randomUUID(), bankName: "", tenureMonths: 3, chargePercent: 0, isActive: true }] })}>Add bank / tenure</button>
          <div><button type="submit" className="button">{pending ? "Saving…" : "Save EMI settings"}</button></div>
        </fieldset>
      </form>}
    </div>
  </Modal>;
}
