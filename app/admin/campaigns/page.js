import Link from "next/link";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/backend/utils/hasPermission";
import CampaignDeleteButton from "./components/CampaignDeleteButton";
import CampaignStatusButton from "./components/CampaignStatusButton";

export const dynamic = "force-dynamic";

function schedulesOverlap(left, right) {
  const leftStart = left.startAt ? new Date(left.startAt).getTime() : Number.NEGATIVE_INFINITY;
  const leftEnd = left.endAt ? new Date(left.endAt).getTime() : Number.POSITIVE_INFINITY;
  const rightStart = right.startAt ? new Date(right.startAt).getTime() : Number.NEGATIVE_INFINITY;
  const rightEnd = right.endAt ? new Date(right.endAt).getTime() : Number.POSITIVE_INFINITY;
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

function getCampaignStatus(campaign, now) {
  if (campaign.status === "PUBLISHED") {
    if (campaign.endAt && new Date(campaign.endAt) < now) return "EXPIRED";
    if (campaign.startAt && new Date(campaign.startAt) > now) return "SCHEDULED";
    return "ACTIVE";
  }
  return campaign.status;
}

const statusLabel = { DRAFT: "Draft", ACTIVE: "Active", SCHEDULED: "Scheduled", PAUSED: "Paused", EXPIRED: "Expired" };
const statusClass = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  DRAFT: "bg-slate-100 text-slate-700",
  PAUSED: "bg-amber-100 text-amber-800",
  EXPIRED: "bg-rose-100 text-rose-800",
};

export default async function CampaignsPage({ searchParams }) {
  await hasPermission("campaign", "view");
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params?.page, 10) || 1);
  const query = String(params?.q || "").trim().slice(0, 100);
  const where = query ? { name: { contains: query, mode: "insensitive" } } : {};
  const now = new Date();
  const [campaigns, total, stackableCampaigns] = await Promise.all([
    prisma.campaign.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20, include: { _count: { select: { products: true, categories: true, usages: true } } } }),
    prisma.campaign.count({ where }),
    prisma.campaign.findMany({ where: { status: "PUBLISHED", OR: [{ endAt: null }, { endAt: { gte: now } }] }, select: { id: true, name: true, startAt: true, endAt: true, stackable: true, exclusive: true } }),
  ]);
  const campaignsWithStackCounts = campaigns.map((campaign) => ({
    ...campaign,
    statusLabel: getCampaignStatus(campaign, now),
    combinableCampaigns: campaign.stackable && !campaign.exclusive && getCampaignStatus(campaign, now) !== "EXPIRED"
      ? stackableCampaigns.filter((other) => other.id !== campaign.id && other.stackable && !other.exclusive && schedulesOverlap(campaign, other))
      : [],
  }));

  return <div className="space-y-5 p-3 sm:p-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Campaigns</h1><p className="text-sm text-text-muted">Manage campaign status, schedule, and usage.</p></div><Link href="/admin/campaigns/create" className="rounded-lg bg-primary px-4 py-2 text-white">Create campaign</Link></header>
    <form className="flex gap-2"><input name="q" defaultValue={query} placeholder="Search campaigns" className="min-w-0 flex-1 rounded-lg border bg-surface p-2" /><button className="rounded-lg border px-4">Search</button>{query && <Link href="/admin/campaigns" className="p-2 underline">Clear</Link>}</form>
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead><tr className="border-b bg-surface-muted"><th className="p-3">Campaign</th><th className="p-3">Group / Discount</th><th className="p-3">Priority</th><th className="p-3">Status</th><th className="p-3">Can combine with</th><th className="p-3">Schedule</th><th className="p-3">Usage</th><th className="p-3">Actions</th></tr></thead>
        <tbody>
          {campaignsWithStackCounts.map((campaign) => <tr key={campaign.id} className="border-b">
            <td className="p-3"><div className="font-semibold">{campaign.name}</div>{campaign.couponCode && <span className="text-xs text-text-muted">{campaign.couponCode}</span>}</td>
            <td className="p-3">{campaign.group || campaign.type}<br /><span className="text-xs">{campaign.discountValue} {campaign.discountType}</span></td>
            <td className="p-3 font-semibold">{campaign.priority ?? 0}</td>
            <td className="p-3"><span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-semibold " + (statusClass[campaign.statusLabel] || "bg-surface-muted")}>{statusLabel[campaign.statusLabel] || campaign.statusLabel}</span></td>
            <td className="max-w-72 p-3">{campaign.stackable && !campaign.exclusive ? campaign.combinableCampaigns.length ? <><strong>{campaign.combinableCampaigns.length} campaigns</strong><div className="mt-1 flex flex-wrap gap-1">{campaign.combinableCampaigns.map((other) => <span key={other.id} className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">{other.name}</span>)}</div></> : <span className="text-text-muted">No compatible campaigns</span> : <span className="text-text-muted">0 · Exclusive</span>}</td>
            <td className="p-3 text-xs">{campaign.startAt ? new Date(campaign.startAt).toLocaleString() : "Now"}<br />{campaign.endAt ? new Date(campaign.endAt).toLocaleString() : "No end"}</td>
            <td className="p-3">{campaign._count.usages} / {campaign.usageLimit || "∞"}</td>
            <td className="flex flex-wrap gap-2 p-3"><Link href={"/admin/campaigns/" + campaign.id + "/edit"} className="rounded-lg border px-3 py-1.5 text-sm">Edit</Link><CampaignStatusButton id={campaign.id} status={campaign.status} /><CampaignDeleteButton id={campaign.id} disabled={campaign._count.usages > 0} /></td>
          </tr>)}
          {!campaignsWithStackCounts.length && <tr><td colSpan={8} className="p-6 text-center">No campaigns found.</td></tr>}
        </tbody>
      </table>
    </div>
    <nav className="flex justify-between"><span>{total} campaigns · Page {page}</span><div className="flex gap-4">{page > 1 && <Link href={"?q=" + encodeURIComponent(query) + "&page=" + (page - 1)}>Previous</Link>}{page * 20 < total && <Link href={"?q=" + encodeURIComponent(query) + "&page=" + (page + 1)}>Next</Link>}</div></nav>
  </div>;
}
