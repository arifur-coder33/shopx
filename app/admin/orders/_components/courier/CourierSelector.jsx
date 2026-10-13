"use client";

import {
  getAvailableCourierProvidersForOrder,
  getCourierProvidersForManualEntryAction,
} from "@/backend/serverActions/courierAction";
import { ArrowLeft, CheckCircle2, ClipboardPenLine } from "lucide-react";
import { useEffect, useState } from "react";

export default function CourierSelector({ onSelect, activeCourierId }) {
  const [couriers, setCouriers] = useState([]);
  const [error, setError] = useState("");
  const [manualCouriers, setManualCouriers] = useState([]);
  const [manualError, setManualError] = useState("");
  const [showManualCouriers, setShowManualCouriers] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  useEffect(() => {
    getAvailableCourierProvidersForOrder().then((result) => {
      if (result.success) setCouriers(result.data);
      else setError(result.message);
    });
  }, []);
  const openManualEntry = async () => {
    setShowManualCouriers(true);
    setManualError("");
    setManualLoading(true);
    const result = await getCourierProvidersForManualEntryAction();
    setManualLoading(false);
    if (result.success) setManualCouriers(result.data);
    else setManualError(result.message);
  };
  if (showManualCouriers) {
    return <div className="space-y-3">
      <button type="button" onClick={() => setShowManualCouriers(false)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600"><ArrowLeft size={16} /> Back to courier options</button>
      <p className="text-sm text-slate-600">Select the courier you booked outside this system, then enter its consignment number.</p>
      {manualLoading && <p className="text-sm text-slate-500">Loading courier list…</p>}
      {manualError && <p className="text-sm text-red-600">{manualError}</p>}
      {!manualLoading && !manualError && !manualCouriers.length && <p className="text-sm text-slate-500">No active couriers are configured.</p>}
      <div className="grid grid-cols-1 gap-3">
        {manualCouriers.map((courier) => <button type="button" key={courier.id} onClick={() => onSelect(courier, true)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 transition-all hover:border-indigo-300">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 font-bold text-white">{courier.name[0]}</div><div className="text-left"><span className="block font-semibold text-slate-700">{courier.name}</span><small className="text-slate-500">Manual consignment entry</small></div></div><span className="text-slate-400">→</span>
        </button>)}
      </div>
    </div>;
  }
  return (
    <div className="grid grid-cols-1 gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {couriers.map((courier) => (
        <button
          type="button"
          key={courier.id}
          onClick={() => onSelect(courier)}
          className={`flex w-full items-center justify-between rounded-xl border p-4 transition-all ${
            activeCourierId === courier.id
              ? "border-green-500 bg-green-50"
              : "border-slate-200 hover:border-indigo-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">{courier.name[0]}</div>
            <div className="text-left"><span className="block font-semibold text-slate-700">{courier.name}</span><small className="text-slate-500">{courier.adapterKey}</small></div>
          </div>
          {activeCourierId === courier.id ? <CheckCircle2 className="text-green-600" size={20} /> : <span className="text-slate-400">→</span>}
        </button>
      ))}
      {!couriers.length && !error && <p className="text-sm text-slate-500">No active, account-mapped API courier is configured.</p>}
      <button type="button" onClick={openManualEntry} className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-400 bg-slate-50 p-4 text-left transition hover:border-indigo-400 hover:bg-indigo-50">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white"><ClipboardPenLine size={19} /></div><div><span className="block font-semibold text-slate-700">Manual entry</span><small className="text-slate-500">Already booked with the courier? Enter its CN number.</small></div></div><span className="text-slate-400">→</span>
      </button>
    </div>
  );
}
