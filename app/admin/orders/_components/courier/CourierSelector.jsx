import { CheckCircle2 } from "lucide-react";

const COURIERS = [
  { id: "pathao", name: "pathao", color: "bg-red-600" },
  { id: "steadfast", name: "steadfast", color: "bg-blue-600" },
  { id: "ecourier", name: "ecourier", color: "bg-orange-500" },
];

export default function CourierSelector({ onSelect, activeCourierId }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {COURIERS.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c)}
          className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
            activeCourierId === c.id
              ? "border-green-500 bg-green-50"
              : "border-slate-200 hover:border-indigo-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${c.color}`}
            >
              {c.name[0]}
            </div>
            <span className="font-semibold text-slate-700">{c.name}</span>
          </div>
          {activeCourierId === c.id ? (
            <CheckCircle2 className="text-green-600" size={20} />
          ) : (
            <span className="text-slate-400">→</span>
          )}
        </button>
      ))}
    </div>
  );
}
