import { Calendar, XCircle } from "lucide-react";

export default function CourierStatus({ details, onCancel }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
            {details.status}
          </span>
          <h4 className="mt-2 font-bold text-slate-800 text-lg uppercase">
            {details.courierName}
          </h4>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div className="flex items-center gap-1 justify-end">
            <Calendar size={12} /> {details.date}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-y border-slate-50 py-4">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            Consignment ID
          </p>
          <p className="text-sm font-mono font-bold text-indigo-600">
            #{details.cnNumber}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            Pickup From
          </p>
          <p className="text-sm font-semibold">{details.storeName}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
          Print Label
        </button>
        {details.status !== "SHIPPED" && (
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 px-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
          >
            <XCircle size={16} /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
