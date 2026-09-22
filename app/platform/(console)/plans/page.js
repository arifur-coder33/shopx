import prisma from "@/lib/prisma";
import { requirePlatformPage } from "@/backend/services/platformConsole.server";
import { hasPlatformPermission } from "@/backend/services/identityAuthorization.server";
import { savePlatformPlanAction } from "@/backend/serverActions/platformConsoleActions";
import { Feedback, Field, inputClass, buttonClass, Panel, Status } from "../../_components/PlatformUI";
import SubmitButton from "../../_components/SubmitButton";

export const metadata = { title: "Plans | Platform" };
const price = (value) => value == null ? "Not set" : new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(value / 100);

function PlanForm({ plan }) {
  return <form action={savePlatformPlanAction} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="planId" value={plan?.id || ""} />
    <Field label="Name"><input required name="name" defaultValue={plan?.name || ""} className={inputClass} /></Field>
    <Field label="Slug"><input required name="slug" defaultValue={plan?.slug || ""} readOnly={plan?.slug === "FREE"} className={inputClass} /></Field>
    <Field label="Monthly price (minor units)"><input type="number" min="0" step="1" name="monthlyPriceMinor" defaultValue={plan?.monthlyPriceMinor ?? ""} className={inputClass} /></Field>
    <Field label="Yearly price (minor units)"><input type="number" min="0" step="1" name="yearlyPriceMinor" defaultValue={plan?.yearlyPriceMinor ?? ""} className={inputClass} /></Field>
    <div className="sm:col-span-2"><Field label="Description"><input name="description" defaultValue={plan?.description || ""} className={inputClass} /></Field></div>
    <Field label="Features JSON (boolean values)"><textarea name="features" rows={3} defaultValue={JSON.stringify(plan?.features || {}, null, 2)} className={inputClass} /></Field>
    <Field label="Limits JSON (non-negative integers)"><textarea name="limits" rows={3} defaultValue={JSON.stringify(plan?.limits || {}, null, 2)} className={inputClass} /></Field>
    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="isActive" defaultChecked={plan?.isActive ?? true} disabled={plan?.slug === "FREE"} />Active{plan?.slug === "FREE" && <input type="hidden" name="isActive" value="on" />}</label>
    <div className="flex justify-end"><SubmitButton className={buttonClass}>{plan ? "Save Plan" : "Create Plan"}</SubmitButton></div>
  </form>;
}

export default async function PlatformPlansPage({ searchParams }) {
  await requirePlatformPage("BILLING", "VIEW");
  const [plans, canManage] = await Promise.all([prisma.plan.findMany({ orderBy: { createdAt: "asc" } }), hasPlatformPermission("BILLING", "MANAGE")]);
  return <><div><p className="text-sm font-semibold text-indigo-700">Commercial catalog</p><h1 className="text-3xl font-bold">Plans</h1><p className="mt-1 text-sm text-slate-600">Prices are stored in minor currency units. No subscription payment is processed here.</p></div><Feedback searchParams={await searchParams} />
    <div className="grid gap-5 xl:grid-cols-2">{plans.map((plan) => <Panel key={plan.id} title={plan.name} action={<Status value={plan.isActive ? "ACTIVE" : "INACTIVE"} />}><p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{plan.slug}</p><div className="mb-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3">Monthly<strong className="mt-1 block text-lg">{price(plan.monthlyPriceMinor)}</strong></div><div className="rounded-xl bg-slate-50 p-3">Yearly<strong className="mt-1 block text-lg">{price(plan.yearlyPriceMinor)}</strong></div></div><p className="mb-4 text-sm text-slate-600">{plan.description || "No description"}</p>{canManage ? <details><summary className="cursor-pointer font-semibold text-indigo-700">Edit Plan</summary><div className="mt-4"><PlanForm plan={plan} /></div></details> : <div className="grid gap-2 text-xs"><pre className="overflow-auto rounded-lg bg-slate-50 p-2">Features: {JSON.stringify(plan.features)}</pre><pre className="overflow-auto rounded-lg bg-slate-50 p-2">Limits: {JSON.stringify(plan.limits)}</pre></div>}</Panel>)}</div>
    {canManage && <Panel title="Create Plan"><PlanForm /></Panel>}
  </>;
}
