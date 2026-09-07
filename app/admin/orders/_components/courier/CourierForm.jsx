import Link from "next/link";

export default function CourierForm({ data, onSubmit, loading, provider }) {
  const pickupPoints = provider?.pickupPoints || [];
  const isManual = provider?.adapterKey === "MANUAL";
  const pickupRequired = provider?.adapterKey === "PATHAO";
  const cannotBook = pickupRequired && pickupPoints.length === 0;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-lg bg-slate-100 p-3 text-xs font-bold uppercase text-slate-600">
        Booking with {provider?.name}
      </div>
      {isManual ? (
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase text-slate-500">Consignment number</label>
          <input type="text" className="w-full rounded-xl border border-slate-200 p-3 text-sm" name="cn" />
        </div>
      ) : (
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase text-slate-500">Pickup store</label>
          {pickupPoints.length ? (
            <select required={pickupRequired} name="pickupPointId" defaultValue="" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <option value="">Select pickup point</option>
              {pickupPoints.map((point) => <option key={point.id} value={point.id}>{point.name} · Store {point.storeId} · {point.address}</option>)}
            </select>
          ) : (
            <div className={`rounded-xl border p-3 text-sm ${pickupRequired ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
              No pickup point is configured for {provider?.name}.{" "}
              <Link href="/admin/settings/pickup-point" className="font-bold underline">Create pickup point</Link>
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1 text-[11px] font-bold uppercase text-slate-500">Customer name<input className="w-full rounded-xl border border-slate-200 p-3 text-sm font-normal normal-case" name="name" defaultValue={data.name} /></label>
        <label className="space-y-1 text-[11px] font-bold uppercase text-slate-500">Phone<input className="w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" name="phone" defaultValue={data.phone} /></label>
      </div>
      <label className="block space-y-1 text-[11px] font-bold uppercase text-slate-500">Delivery address<textarea className="w-full rounded-xl border border-slate-200 p-3 text-sm font-normal normal-case" rows="2" name="address" defaultValue={data.address} /></label>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <label className="space-y-1 text-[11px] font-bold uppercase text-slate-500">COD amount<input type="number" min="0" step="0.01" className="w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" name="price" defaultValue={data.price} /></label>
        <label className="space-y-1 text-[11px] font-bold uppercase text-slate-500">Weight<input type="number" min="0" step="0.01" className="w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" name="weight" defaultValue={data.weight} /></label>
        <label className="col-span-2 space-y-1 text-[11px] font-bold uppercase text-slate-500 md:col-span-1">City<input className="w-full rounded-xl border border-slate-200 p-3 text-sm font-normal normal-case" name="city" defaultValue={data.city} /></label>
      </div>
      <button disabled={loading || cannotBook} className="w-full rounded-xl bg-indigo-600 py-4 font-bold text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
        {loading
          ? "Creating order…"
          : cannotBook
            ? "Create a Pathao pickup point first"
            : "Confirm order & create courier"}
      </button>
    </form>
  );
}
