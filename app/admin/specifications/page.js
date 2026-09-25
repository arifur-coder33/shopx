import Link from "next/link";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission } from "@/backend/utils/hasPermission";
import LazyModalButton from "@/components/modal/LazyModalButton";
import DeleteSpecificationButton from "./components/DeleteSpecificationButton";

export default async function SpecificationsPage({ searchParams }) {
  await hasPermission("specification", "view");
  const session = await auth();
  const permissions = session.user.permissions || [];
  const can = (action) => permissions.includes("*") || permissions.includes(`specification:${action}`);
  const params = await searchParams;
  const query = String(params?.q || "").trim().slice(0, 100);
  const page = Math.max(1, Math.min(10000, Number.parseInt(params?.page, 10) || 1));
  const where = query ? { name: { contains: query, mode: "insensitive" } } : {};
  const [rows, total] = await Promise.all([
    prisma.specification.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * 20, take: 20, include: { parent: { select: { id: true, name: true } }, _count: { select: { children: true, categories: true, values: true } } } }),
    prisma.specification.count({ where }),
  ]);
  return <div className="space-y-5 p-3 sm:p-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Specifications</h1>{can("create") && <LazyModalButton componentKey="SpecificationForm" button={<button type="button" className="rounded-lg bg-primary px-4 py-2 text-white">Add specification</button>} />}</header>
    <p className="text-sm text-slate-500">Create reusable names here. A parent can have its own value, or optional child fields.</p>
    <form className="flex gap-2"><input aria-label="Search specifications" name="q" defaultValue={query} placeholder="Search specification name" className="min-w-0 flex-1 rounded-lg border bg-surface p-2" /><button className="rounded-lg border px-4">Search</button>{query && <Link className="p-2 underline" href="/admin/specifications">Clear</Link>}</form>
    <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-surface-muted"><th className="p-3">Name</th><th className="p-3">Parent</th><th className="p-3">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b"><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.parent?.name || "Parent / standalone"}</td><td className="flex gap-2 p-3">{can("update") && <LazyModalButton componentKey="SpecificationForm" itemId={row.id} data={row} button={<button type="button" className="rounded border px-3 py-1.5">Edit</button>} />}{can("delete") && <DeleteSpecificationButton id={row.id} disabled={Object.values(row._count).some(Boolean)} />}</td></tr>)}{!rows.length && <tr><td colSpan={3} className="p-6 text-center">No specifications found.</td></tr>}</tbody></table></div>
    <nav aria-label="Specification pagination" className="flex items-center justify-between"><span>{total} specifications · Page {page}</span><div className="flex gap-4">{page > 1 && <Link href={`?q=${encodeURIComponent(query)}&page=${page - 1}`}>Previous</Link>}{page * 20 < total && <Link href={`?q=${encodeURIComponent(query)}&page=${page + 1}`}>Next</Link>}</div></nav>
  </div>;
}
