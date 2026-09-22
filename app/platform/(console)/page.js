import Link from "next/link";
import prisma from "@/lib/prisma";
import { requirePlatformPage } from "@/backend/services/platformConsole.server";
import { subscriptionGrantsPlan } from "@/backend/services/storeSubscriptionService";
import { DateValue, Empty, Panel, Status, TableWrap, Td, Th } from "../_components/PlatformUI";

export const metadata = { title: "Platform dashboard" };

export default async function PlatformDashboard() {
  await requirePlatformPage();
  const [stores, plans, recent] = await Promise.all([
    prisma.store.findMany({ select: { id: true, status: true, currentSubscriptionId: true } }),
    prisma.plan.count(),
    prisma.store.findMany({ take: 8, orderBy: { createdAt: "desc" }, select: { id: true, name: true, slug: true, status: true, createdAt: true } }),
  ]);
  const ids = stores.map((store) => store.currentSubscriptionId).filter(Boolean);
  const current = ids.length ? await prisma.subscription.findMany({ where: { id: { in: ids } }, select: { id: true, storeId: true, status: true, currentPeriodStart: true, currentPeriodEnd: true, trialStartedAt: true, trialEndsAt: true, plan: { select: { slug: true } } } }) : [];
  const byId = new Map(current.map((subscription) => [subscription.id, subscription]));
  const active = stores.filter((store) => {
    const subscription = byId.get(store.currentSubscriptionId);
    return subscription?.storeId === store.id && subscriptionGrantsPlan(subscription);
  }).length;
  const free = stores.filter((store) => {
    const subscription = byId.get(store.currentSubscriptionId);
    return !subscription || subscription.storeId !== store.id || !subscriptionGrantsPlan(subscription) || subscription.plan.slug === "FREE";
  }).length;
  const cards = [["Total Stores", stores.length], ["Active Stores", stores.filter((store) => store.status === "ACTIVE").length],
    ["Suspended Stores", stores.filter((store) => store.status === "INACTIVE").length], ["Total Plans", plans], ["Active Subscriptions", active], ["Stores on Free", free]];
  return <><div><p className="text-sm font-semibold text-indigo-700">Overview</p><h1 className="text-3xl font-bold">Platform dashboard</h1><p className="mt-1 text-sm text-slate-600">Live Store and subscription data.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-black tabular-nums">{value}</p></div>)}</div>
    <Panel title="Recent Stores" action={<Link href="/platform/stores" className="text-sm font-semibold text-indigo-700 hover:underline">View all</Link>}>
      {!recent.length ? <Empty>No Stores yet.</Empty> : <TableWrap><thead><tr><Th>Store</Th><Th>Status</Th><Th>Created</Th><Th></Th></tr></thead><tbody>{recent.map((store) => <tr key={store.id}><Td><strong>{store.name}</strong><span className="block text-xs text-slate-500">{store.slug}</span></Td><Td><Status value={store.status} /></Td><Td><DateValue value={store.createdAt} /></Td><Td><Link href={`/platform/stores/${store.id}`} className="font-semibold text-indigo-700">Open</Link></Td></tr>)}</tbody></TableWrap>}
    </Panel></>;
}
