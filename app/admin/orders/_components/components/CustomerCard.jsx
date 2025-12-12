import { MapPin, Phone, User } from "lucide-react";

export default function CustomerCard({ customer }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
          Customer Details
        </h3>
        <button className="text-blue-600 text-xs font-medium hover:underline">
          Edit
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3 items-start">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <User size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {customer.customerName}
            </p>
            <p className="text-xs text-slate-500">Customer since 2023</p>
          </div>
        </div>

        <div className="space-y-3 pl-11">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone size={14} className="text-slate-400" />
            <a
              href={`tel:${customer.phone}`}
              className="hover:text-blue-600 transition"
            >
              {customer.phone}
            </a>
          </div>

          <div className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin size={14} className="text-slate-400 mt-0.5" />
            <span className="leading-snug">{customer.address}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
