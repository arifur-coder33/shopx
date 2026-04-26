"use client";

import { CreditCard, ShieldCheck, Truck } from "lucide-react";

export default function DeliveryInfo() {
  return (
    <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* CARD 1 */}
      <div className="flex items-center gap-3 p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition">
        <div className="p-2 rounded-full bg-blue-50 text-blue-600">
          <Truck size={20} />
        </div>

        <div>
          <p className="font-semibold text-gray-800">Fast Delivery</p>
          <p className="text-xs text-gray-500">2–5 দিনের মধ্যে ডেলিভারি</p>
        </div>
      </div>

      {/* CARD 2 */}
      <div className="flex items-center gap-3 p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition">
        <div className="p-2 rounded-full bg-green-50 text-green-600">
          <ShieldCheck size={20} />
        </div>

        <div>
          <p className="font-semibold text-gray-800">Check Before Pay</p>
          <p className="text-xs text-gray-500">
            রাইডারের সামনে প্রোডাক্ট চেক করুন
          </p>
        </div>
      </div>

      {/* CARD 3 */}
      <div className="flex items-center gap-3 p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition">
        <div className="p-2 rounded-full bg-indigo-50 text-indigo-600">
          <CreditCard size={20} />
        </div>

        <div>
          <p className="font-semibold text-gray-800">No Advance</p>
          <p className="text-xs text-gray-500">এক টাকাও আগেই দিতে হবে না</p>
        </div>
      </div>
    </div>
  );
}
