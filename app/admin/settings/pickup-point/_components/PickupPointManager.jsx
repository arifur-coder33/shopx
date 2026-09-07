"use client";

import { createPickupPoint, deletePickupPoint, updatePickupPoint } from "@/backend/serverActions/pickupPointAction";
import Modal from "@/components/modal/Modal";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

const path = "/admin/settings/pickup-point";
const inputClass = "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

function pageHref(page, filters) {
  const query = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value && key !== "page") query.set(key, value);
  });
  query.set("page", page);
  return `${path}?${query}`;
}

export default function PickupPointManager({ result }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [editing, setEditing] = useState(null);
  const [pending, startTransition] = useTransition();
  const permissions = session?.user?.permissions || [];
  const canCreate = hasUIPermission(permissions, "provider", "create");
  const canUpdate = hasUIPermission(permissions, "provider", "update");
  const canDelete = hasUIPermission(permissions, "provider", "delete");

  if (!result.success) return <main className="p-5"><div className="card">{result.message}</div></main>;

  const { pickupPoints, providers } = result.data;
  const filters = result.filters || {};
  const pagination = result.pagination;
  const hasFilters = Boolean(filters.name || filters.storeId || filters.courierProviderId);

  const submit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const response = editing?.id ? await updatePickupPoint(formData) : await createPickupPoint(formData);
      if (!response.success) return toast.error(response.message);
      toast.success(response.message);
      setEditing(null);
      router.refresh();
    });
  };

  const remove = (point) => {
    if (!window.confirm(`Delete pickup point “${point.name}”?`)) return;
    startTransition(async () => {
      const response = await deletePickupPoint(point.id);
      if (response.success) {
        toast.success(response.message);
        router.refresh();
      } else toast.error(response.message);
    });
  };

  return (
    <main className="space-y-5 p-3 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Courier Pickup Points</h1><p className="text-sm text-text-muted">Save Pathao Store IDs and reusable pickup locations for any courier provider.</p></div>
        <button type="button" disabled={!canCreate} onClick={() => setEditing({})} className="button disabled:opacity-40"><Plus className="h-4 w-4" /> Add pickup point</button>
      </header>

      <section className="rounded-xl border border-primary/30 bg-primary-soft p-3 text-sm"><strong>Pathao:</strong> use the numeric Store ID assigned by Pathao. During courier booking, only pickup points belonging to the selected courier will appear.</section>

      <form className="grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-4">
        <input className={inputClass} name="name" defaultValue={filters.name || ""} placeholder="Store location/name" />
        <input className={inputClass} name="storeId" defaultValue={filters.storeId || ""} placeholder="Store ID" />
        <select className={inputClass} name="courierProviderId" defaultValue={filters.courierProviderId || ""}><option value="">All couriers</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name} · {provider.adapterKey}</option>)}</select>
        <button className="button">Search fields</button>
        {hasFilters && <Link href={path} className="inline-flex items-center gap-1 text-sm text-danger sm:col-span-4 sm:justify-self-end"><X className="h-4 w-4" /> Remove filters</Link>}
      </form>

      <section className="responsive-table overflow-hidden rounded-xl border border-border bg-surface">
        <table className="min-w-[900px] text-left text-sm">
          <thead className="bg-surface-muted"><tr>{["Courier", "Store ID", "Store location", "Contact address", "Phone", "Email", "Actions"].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
          <tbody>{pickupPoints.map((point) => <tr key={point.id} className="border-t border-border">
            <td className="p-3"><span className="font-semibold">{point.courierProvider?.name || point.courierName || "—"}</span><small className="block text-text-muted">{point.courierProvider?.adapterKey || "Legacy"}</small></td>
            <td className="p-3 font-mono">{point.storeId}</td>
            <td className="p-3 font-semibold"><span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-primary" />{point.name}</span></td>
            <td className="max-w-xs p-3">{point.address}</td><td className="p-3">{point.phoneNumber || "—"}</td><td className="p-3">{point.email || "—"}</td>
            <td className="p-3"><div className="flex gap-2"><button type="button" disabled={!canUpdate || pending} onClick={() => setEditing(point)} className="button disabled:opacity-40"><Pencil className="h-4 w-4" /> Edit</button><button type="button" disabled={!canDelete || pending} onClick={() => remove(point)} className="button text-danger disabled:opacity-40"><Trash2 className="h-4 w-4" /> Delete</button></div></td>
          </tr>)}</tbody>
        </table>
      </section>
      {!pickupPoints.length && <div className="card text-center text-text-muted">No pickup points found.</div>}

      {pagination.totalPages > 1 && <nav className="flex items-center justify-between gap-3 text-sm"><span>{pagination.total} pickup points</span><div className="flex items-center gap-2"><Link href={pageHref(pagination.page - 1, filters)} className={`button ${pagination.page <= 1 ? "pointer-events-none opacity-40" : ""}`}>Previous</Link><span className="rounded-xl border border-border px-3 py-2">{pagination.page} / {pagination.totalPages}</span><Link href={pageHref(pagination.page + 1, filters)} className={`button ${pagination.page >= pagination.totalPages ? "pointer-events-none opacity-40" : ""}`}>Next</Link></div></nav>}

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)}>
        {editing && <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
          <h2 className="text-xl font-bold">{editing.id ? "Edit" : "Add"} pickup point</h2>{editing.id && <input type="hidden" name="id" value={editing.id} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">Courier provider<select required className={inputClass} name="courierProviderId" defaultValue={editing.courierProviderId || ""}><option value="">Select courier</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name} · {provider.adapterKey}{provider.isActive ? "" : " (disabled)"}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-semibold">Store ID<input required className={inputClass} name="storeId" defaultValue={editing.storeId || ""} placeholder="Pathao example: 12345" /></label>
            <label className="grid gap-1 text-sm font-semibold">Store location/name<input required className={inputClass} name="name" defaultValue={editing.name || ""} placeholder="Dhaka warehouse" /></label>
            <label className="grid gap-1 text-sm font-semibold">Phone<input className={inputClass} name="phoneNumber" defaultValue={editing.phoneNumber || ""} /></label>
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Contact address<textarea required rows={3} className={inputClass} name="address" defaultValue={editing.address || ""} /></label>
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Email<input type="email" className={inputClass} name="email" defaultValue={editing.email || ""} /></label>
          </div>
          <button disabled={pending} className="button w-full">{pending ? "Saving…" : "Save pickup point"}</button>
        </form>}
      </Modal>
    </main>
  );
}
