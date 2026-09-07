"use client";

import { getAvailableCourierProvidersForOrder } from "@/backend/serverActions/courierAction";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function CourierSelector({ onSelect, activeCourierId }) {
  const [couriers, setCouriers] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    getAvailableCourierProvidersForOrder().then((result) => {
      if (result.success) setCouriers(result.data);
      else setError(result.message);
    });
  }, []);
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!couriers.length) return <p className="text-sm text-slate-500">No active, account-mapped courier is configured.</p>;
  return (
    <div className="grid grid-cols-1 gap-3">
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
    </div>
  );
}
