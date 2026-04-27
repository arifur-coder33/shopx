"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// 🔥 Lazy load modal
const EMIModal = dynamic(() => import("./EMIModal"), {
  ssr: false,
  loading: () => (
    <p className="text-sm text-gray-500 mt-2">Loading EMI options...</p>
  ),
});

export default function EMISection({ price = 132000 }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* EMI SUMMARY BAR */}
      <div className="flex items-center justify-between bg-orange-50 p-3 rounded-xl mt-4 shadow-sm">
        <div>
          <p className="text-sm text-gray-600">
            💳 EMI সুবিধা (Installment Available)
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="text-blue-600 text-sm font-medium underline"
        >
          Check Plan
        </button>
      </div>

      {/* 🔥 Load only on click */}
      {open && <EMIModal price={price} onClose={() => setOpen(false)} />}
    </>
  );
}
