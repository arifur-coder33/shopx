import Link from "next/link";
import prisma from "@/lib/prisma";
import { requirePlatformPage } from "@/backend/services/platformConsole.server";
import { hasPlatformPermission } from "@/backend/services/identityAuthorization.server";
import { createPlatformStoreAction } from "@/backend/serverActions/platformConsoleActions";
import { DateValue, Empty, Feedback, Field, inputClass, buttonClass, Pager, Panel, Status, TableWrap, Td, Th } from "../../_components/PlatformUI";
import SubmitButton from "../../_components/SubmitButton";

export const metadata = { title: "Stores | Platform" };

export default async function PlatformStoresPage({ searchParams }) {
  await requirePlatformPage("STORES", "VIEW");
  const params = await searchParams;
  const query = String(params?.q || "").trim().slice(0, 80);
  const page = Math.max(1, Math.min(10000, Number.parseInt(params?.page, 10) || 1));
  const status = ["ACTIVE", "INACTIVE"].includes(params?.status) ? params.status : "";
  const where = { ...(status ? { status } : {}), ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { slug: { contains: query, mode: "insensitive" } }] } : {}) };
  const [rows, count, canManage] = await Promise.all([
    prisma.store.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 21,
      select: { id: true, name: true, slug: true, status: true, createdAt: true, currentSubscriptionId: true,
        domains: { take: 1, orderBy: { isPrimary: "desc" }, select: { domain: true, isVerified: true } },
        members: { where: { role: { code: "OWNER" } }, take: 1, select: { name: true, email: true } } } }),
    prisma.store.count({ where }), hasPlatformPermission("STORES", "MANAGE"),
  ]);
  const visible = rows.slice(0, 20);
  const ids = visible.map((row) => row.currentSubscriptionId).filter(Boolean);
  const subscriptions = ids.length ? await prisma.subscription.findMany({ where: { id: { in: ids } }, select: { id: true, storeId: true, status: true, plan: { select: { name: true } } } }) : [];
  const byId = new Map(subscriptions.map((row) => [row.id, row]));
  const qs = `&q=${encodeURIComponent(query)}${status ? `&status=${status}` : ""}`;
  return <><div><p className="text-sm font-semibold text-indigo-700">Directory</p><h1 className="text-3xl font-bold">Stores</h1><p className="mt-1 text-sm text-slate-600">{count} Store{count === 1 ? "" : "s"} match your filters.</p></div><Feedback searchParams={params} />
    <Panel title="Find a Store"><form className="flex flex-wrap gap-3" method="get"><input aria-label="Search Stores" name="q" defaultValue={query} placeholder="Search name or slug" className={`${inputClass} max-w-sm`} /><select aria-label="Filter status" name="status" defaultValue={status} className={`${inputClass} max-w-44`}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Suspended</option></select><button className={buttonClass}>Search</button></form></Panel>
    <Panel title="Store list">{!visible.length ? <Empty>No Stores found.</Empty> : <><TableWrap><thead><tr><Th>Store</Th><Th>Status</Th><Th>Plan</Th><Th>Owner</Th><Th>Domain</Th><Th>Created</Th><Th></Th></tr></thead><tbody>{visible.map((store) => { const sub = byId.get(store.currentSubscriptionId); return <tr key={store.id}><Td><strong>{store.name}</strong><span className="block text-xs text-slate-500">{store.slug}</span></Td><Td><Status value={store.status} /></Td><Td>{sub?.storeId === store.id ? sub.plan.name : "Free"}</Td><Td>{store.members[0]?.name || "—"}<span className="block text-xs">{store.members[0]?.email}</span></Td><Td>{store.domains[0]?.domain || "—"}</Td><Td><DateValue value={store.createdAt} /></Td><Td><Link href={`/platform/stores/${store.id}`} className="font-semibold text-indigo-700">Details</Link></Td></tr>; })}</tbody></TableWrap><Pager path="/platform/stores" page={page} hasMore={rows.length > 20} query={qs} /></>}</Panel>
    {canManage && <Panel title="Create Store"><p className="mb-4 text-sm text-slate-600">Creates a real Store and its first OWNER. It starts on the Free plan; no paid subscription is created.</p><form action={createPlatformStoreAction} className="grid gap-4 sm:grid-cols-2"><Field label="Store name"><input required name="name" minLength={2} maxLength={120} className={inputClass} /></Field><Field label="Store slug"><input required name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} className={inputClass} /></Field><Field label="Owner name"><input required name="ownerName" minLength={2} className={inputClass} /></Field><Field label="Owner email"><input required type="email" name="ownerEmail" className={inputClass} /></Field><Field label="Temporary owner password"><input required type="password" name="ownerPassword" autoComplete="new-password" minLength={10} className={inputClass} /></Field><div className="flex items-end"><SubmitButton className={buttonClass}>Create Store</SubmitButton></div></form></Panel>}
  </>;
}
