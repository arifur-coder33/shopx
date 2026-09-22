import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requirePlatformPage } from "@/backend/services/platformConsole.server";
import { hasPlatformPermission } from "@/backend/services/identityAuthorization.server";
import { setPlatformStoreStatusAction, updatePlatformStoreAction } from "@/backend/serverActions/platformConsoleActions";
import { DateValue, Feedback, Field, inputClass, buttonClass, Panel, Status } from "../../../_components/PlatformUI";
import SubmitButton from "../../../_components/SubmitButton";

export const metadata = { title: "Store details | Platform" };

export default async function PlatformStoreDetails({ params, searchParams }) {
  await requirePlatformPage("STORES", "VIEW");
  const { storeId } = await params;
  if (!/^[0-9a-f]{24}$/i.test(storeId)) notFound();
  const [store, canManage] = await Promise.all([
    prisma.store.findUnique({ where: { id: storeId }, select: { id: true, name: true, slug: true, status: true, createdAt: true, currentSubscriptionId: true,
      domains: { orderBy: { createdAt: "asc" }, select: { id: true, domain: true, status: true, isVerified: true, isPrimary: true } },
      members: { where: { role: { code: "OWNER" } }, select: { id: true, name: true, email: true, status: true } } } }),
    hasPlatformPermission("STORES", "MANAGE"),
  ]);
  if (!store) notFound();
  const subscription = store.currentSubscriptionId ? await prisma.subscription.findUnique({ where: { id: store.currentSubscriptionId, storeId: store.id }, include: { plan: { select: { name: true, slug: true } } } }) : null;
  const query = await searchParams;
  return <><div><p className="text-sm font-semibold text-indigo-700">Store details</p><h1 className="text-3xl font-bold">{store.name}</h1><p className="mt-1 text-sm text-slate-600">{store.slug} · Created <DateValue value={store.createdAt} /></p></div><Feedback searchParams={query} />
    <div className="grid gap-5 lg:grid-cols-2"><Panel title="Overview"><dl className="grid gap-3 text-sm"><div><dt className="text-slate-500">Status</dt><dd><Status value={store.status} /></dd></div><div><dt className="text-slate-500">Current Plan</dt><dd className="font-semibold">{subscription?.plan?.name || "Free"}</dd></div><div><dt className="text-slate-500">Subscription</dt><dd>{subscription ? <Status value={subscription.status} /> : "No billing subscription"}</dd></div><div><dt className="text-slate-500">Owners</dt><dd>{store.members.length ? store.members.map((member) => <span key={member.id} className="block">{member.name} · {member.email} · {member.status}</span>) : "No owner assigned"}</dd></div></dl></Panel>
      <Panel title="Domains"><p className="mb-3 text-xs text-slate-500">Only verified, active domains resolve this Store. DNS verification and custom-domain onboarding are outside Phase 27.</p>{store.domains.length ? <ul className="space-y-2">{store.domains.map((domain) => <li key={domain.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm"><span>{domain.domain}{domain.isPrimary ? " · Primary" : ""}</span><span className={domain.isVerified && domain.status === "ACTIVE" ? "text-emerald-700" : "text-amber-700"}>{domain.isVerified ? domain.status : "Unverified"}</span></li>)}</ul> : <p className="text-sm text-slate-500">No domain configured.</p>}</Panel></div>
    {canManage && <div className="grid gap-5 lg:grid-cols-2"><Panel title="Edit Store"><form action={updatePlatformStoreAction} className="space-y-4"><input type="hidden" name="storeId" value={store.id} /><Field label="Store name"><input required name="name" defaultValue={store.name} className={inputClass} /></Field><Field label="Slug"><input required name="slug" defaultValue={store.slug} className={inputClass} /></Field><SubmitButton className={buttonClass}>Save changes</SubmitButton></form></Panel>
      <Panel title="Store access"><p className="mb-4 text-sm text-slate-600">Suspending disables verified-domain Store resolution. It does not delete Store data.</p><details className="rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold">{store.status === "ACTIVE" ? "Suspend Store…" : "Activate Store…"}</summary><form action={setPlatformStoreStatusAction} className="mt-4 space-y-3"><input type="hidden" name="storeId" value={store.id} /><input type="hidden" name="status" value={store.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"} /><p className="text-sm">Confirm {store.status === "ACTIVE" ? "suspension" : "activation"} of <strong>{store.name}</strong>.</p><SubmitButton className={store.status === "ACTIVE" ? "rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white" : buttonClass}>Confirm</SubmitButton></form></details></Panel></div>}
  </>;
}
