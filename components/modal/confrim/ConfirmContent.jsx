// components/confirm/ConfirmContent.jsx
"use client";

export default function ConfirmContent({
  title,
  message,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="w-full max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
        {title || "Are you sure?"}
      </h2>

      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        {message || "Do you want to continue?"}
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded border px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          Cancel
        </button>

        <button
          onClick={onConfirm}
          className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
