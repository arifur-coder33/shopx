// components/ConfirmModal.jsx
"use client";

import { useState } from "react";

let resolver = null;

export function ConfirmModal() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState({
    title: "Are you sure?",
    message: "Do you want to continue?",
  });

  ConfirmModal.open = (opts = {}) => {
    setOptions((prev) => ({ ...prev, ...opts }));
    setOpen(true);

    return new Promise((resolve) => {
      resolver = resolve;
    });
  };

  const close = (result) => {
    setOpen(false);
    resolver?.(result);
  };

  if (!open) return null;

  return (
    <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
      <h2 className="text-lg font-semibold">{options.title}</h2>
      <p className="mt-2 text-sm text-gray-600">{options.message}</p>

      <div className="mt-5 flex justify-end gap-3">
        <button
          onClick={() => close(false)}
          className="rounded border px-4 py-2 text-sm"
        >
          Cancel
        </button>

        <button
          onClick={() => close(true)}
          className="rounded bg-red-600 px-4 py-2 text-sm text-white"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
