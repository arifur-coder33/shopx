export default function AdminActions({
  status,
  setStatus,
  courier,
  setCourier,
  discount,
  setDiscount,
  note,
  setNote,
  onUpdateStatus,
  onCreateCourier,
  onSaveNote,
}) {
  const steps = [
    "PENDING",
    "PROCESSING",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
      <h3 className="text-lg font-semibold">Admin Actions</h3>

      {/* Status Update */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-500 uppercase">
          Order Status
        </label>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {steps.map((step) => (
              <option key={step} value={step}>
                {step}
              </option>
            ))}
          </select>
          <button
            onClick={onUpdateStatus}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Update
          </button>
        </div>
      </div>

      {/* Courier Selection */}
      {/* <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-500 uppercase">
          Assign Courier
        </label>
        <div className="flex gap-2">
          <select
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Select Courier</option>
            <option value="SteadFast">SteadFast</option>
            <option value="Pathao">Pathao</option>
            <option value="RedX">RedX</option>
            <option value="Sundarban">Sundarban</option>
          </select>
          <button
            onClick={onCreateCourier}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Book
          </button>
        </div>
      </div> */}

      {/* Note & Discount */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">
            Discount Adjustment
          </label>
          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">
            Admin Note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm h-20 resize-none"
            placeholder="Internal notes..."
          ></textarea>
        </div>
        <button
          onClick={onSaveNote}
          className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
