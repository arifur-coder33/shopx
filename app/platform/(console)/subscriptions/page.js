import Link from "next/link";
import prisma from "@/lib/prisma";
import { requirePlatformPage } from "@/backend/services/platformConsole.server";
import { DateValue, Empty, Feedback, inputClass, buttonClass, Pager, Panel, Status, TableWrap, Td, Th } from "../../_components/PlatformUI";

export const metadata = { title: "Subscriptions | Platform" };
const statuses = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED", "SUSPENDED"];

export default async function PlatformSubscriptionsPage({ searchParams }) {
  await requirePlatformPage("BILLING", "VIEW");
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(params?.page, 10) || 1));
  const status = statuses.includes(params?.status) ? params.status : "";
  const query = String(params?.q || "").trim().slice(0, 80);
  const matchingStoreIds = query ? (await prisma.store.findMany({ where: { OR: [{ name: { contains: query, mode: "insensitive" } }, { slug: { contains: query, mode: "insensitive" } }] }, select: { id: true } })).map((store) => store.id) : null;
  const where = { ...(status ? { status } : {}), ...(matchingStoreIds ? { storeId: { in: matchingStoreIds } } : {}) };
  const [rows, count] = await Promise.all([
    prisma.subscription.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 21,
      select: { id: true, storeId: true, status: true, interval: true, startedAt: true, currentPeriodEnd: true, cancelledAt: true,
        plan: { select: { name: true, slug: true } }, store: { select: { name: true, slug: true, currentSubscriptionId: true } } } }),
    prisma.subscription.count({ where }),
  ]);
  return <><div><p className="text-sm font-semibold text-indigo-700">Billing foundation</p><h1 className="text-3xl font-bold">Subscriptions</h1><p className="mt-1 text-sm text-slate-600">{count} historical/current record{count === 1 ? "" : "s"}. Read-only until billing integration is verified.</p></div><Feedback searchParams={params} />
    <Panel title="Filters"><form method="get" className="flex flex-wrap gap-3"><input name="q" aria-label="Search Store" defaultValue={query} placeholder="Store name or slug" className={`${inputClass} max-w-sm`} /><select name="status" aria-label="Filter status" defaultValue={status} className={`${inputClass} max-w-44`}><option value="">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select><button className={buttonClass}>Search</button></form></Panel>
    <Panel title="Subscription records">{!rows.length ? <Empty>No subscriptions found. Stores without billing records use the Free plan.</Empty> : <><TableWrap><thead><tr><Th>Store</Th><Th>Plan</Th><Th>Status</Th><Th>Interval</Th><Th>Started</Th><Th>Period ends</Th><Th>Cancelled</Th></tr></thead><tbody>{rows.slice(0, 20).map((subscription) => <tr key={subscription.id}><Td><Link href={`/platform/stores/${subscription.storeId}`} className="font-semibold text-indigo-700">{subscription.store.name}</Link><span className="block text-xs">{subscription.store.slug} · {subscription.store.currentSubscriptionId === subscription.id ? "Current" : "History"}</span></Td><Td>{subscription.plan.name}</Td><Td><Status value={subscription.status} /></Td><Td>{subscription.interval}</Td><Td><DateValue value={subscription.startedAt} /></Td><Td><DateValue value={subscription.currentPeriodEnd} /></Td><Td><DateValue value={subscription.cancelledAt} /></Td></tr>)}</tbody></TableWrap><Pager path="/platform/subscriptions" page={page} hasMore={rows.length > 20} query={`&q=${encodeURIComponent(query)}${status ? `&status=${status}` : ""}`} /></>}</Panel>
  </>;
}
