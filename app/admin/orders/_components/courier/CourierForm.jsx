const STORES = [
  {
    id: "WH-01",
    name: "ArifSoft",
    address: "Olipur, shayestaganj",
    storeId: "149511",
    courierName: "pathao",
  },
  {
    id: "WH-02",
    name: "ArifSoft",
    address: "Olipur, shayestaganj",
    storeId: "149511",
    courierName: "stedyFast",
  },
  {
    id: "WH-03",
    name: "ArifSoft1",
    address: "Olipur, shayestaganj",
    storeId: "149511",
    courierName: "pathao",
  },
];

export default function CourierForm({
  formData,
  onChange,
  onSubmit,
  loading,
  courierName,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="p-3 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 uppercase">
        Booking with {courierName}
      </div>

      {/* Pickup Selection */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase">
          Pickup Store {courierName}
        </label>
        <select
          name="storeId"
          onChange={onChange}
          className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STORES.filter((s) => s.courierName === courierName).map((s) => (
            <option key={s.id} value={s.storeId}>
              <input type="hidden" name="storeName" value={s.name} />
              {s.name} ({s.address})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase">
            Customer Name
          </label>
          <input
            className="w-full p-3 border border-slate-200 rounded-xl text-sm"
            name="name"
            value={formData.name}
            onChange={onChange}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase">
            Phone
          </label>
          <input
            className="w-full p-3 border border-slate-200 rounded-xl text-sm"
            name="phone"
            value={formData.phone}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase">
          Delivery Address
        </label>
        <textarea
          className="w-full p-3 border border-slate-200 rounded-xl text-sm"
          rows="2"
          name="address"
          value={formData.address}
          onChange={onChange}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase">
            Amount
          </label>
          <input
            type="number"
            className="w-full p-3 border border-slate-200 rounded-xl text-sm"
            name="price"
            value={formData.price}
            onChange={onChange}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase">
            Weight
          </label>
          <input
            type="number"
            className="w-full p-3 border border-slate-200 rounded-xl text-sm"
            name="weight"
            value={formData.weight}
            onChange={onChange}
          />
        </div>
        <div className="space-y-1 col-span-2 md:col-span-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase">
            City
          </label>
          <input
            className="w-full p-3 border border-slate-200 rounded-xl text-sm"
            name="city"
            value={formData.city}
            placeholder="Dhaka"
            onChange={onChange}
          />
        </div>
      </div>

      <button
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
      >
        {loading ? "Creating Order..." : "Confirm & Generate AWB"}
      </button>
    </form>
  );
}
