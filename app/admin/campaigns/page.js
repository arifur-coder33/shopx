import Link from "next/link";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/backend/utils/hasPermission";
import CampaignDeleteButton from "./components/CampaignDeleteButton";
import CampaignStatusButton from "./components/CampaignStatusButton";

export const dynamic = "force-dynamic";

export default async function CampaignsPage({ searchParams }) {
  await hasPermission("campaign", "view");
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params?.page, 10) || 1);
  const query = String(params?.q || "").trim().slice(0, 100);
  const where = query ? { name: { contains: query, mode: "insensitive" } } : {};
  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20, include: { _count: { select: { products: true, categories: true, usages: true } } } }),
    prisma.campaign.count({ where }),
  ]);

  return <div className="space-y-5 p-3 sm:p-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Campaigns</h1><p className="text-sm text-text-muted">Manage campaign status, schedule, and usage.</p></div><Link href="/admin/campaigns/create" className="rounded-lg bg-primary px-4 py-2 text-white">Create campaign</Link></header>
    <form className="flex gap-2"><input name="q" defaultValue={query} placeholder="Search campaigns" className="min-w-0 flex-1 rounded-lg border bg-surface p-2" /><button className="rounded-lg border px-4">Search</button>{query && <Link href="/admin/campaigns" className="p-2 underline">Clear</Link>}</form>
    <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-surface-muted"><th className="p-3">Campaign</th><th className="p-3">Group / Discount</th><th className="p-3">Schedule</th><th className="p-3">Usage</th><th className="p-3">Actions</th></tr></thead><tbody>{campaigns.map((campaign) => <tr key={campaign.id} className="border-b"><td className="p-3"><div className="font-semibold">{campaign.name}</div><span className="text-xs text-text-muted">{campaign.status}{campaign.couponCode ? ` · ${campaign.couponCode}` : ""}</span></td><td className="p-3">{campaign.group || campaign.type}<br /><span className="text-xs">{campaign.discountValue} {campaign.discountType}</span></td><td className="p-3 text-xs">{campaign.startAt ? new Date(campaign.startAt).toLocaleString() : "Now"}<br />{campaign.endAt ? new Date(campaign.endAt).toLocaleString() : "No end"}</td><td className="p-3">{campaign._count.usages} / {campaign.usageLimit || "∞"}</td><td className="flex flex-wrap gap-2 p-3"><Link href={`/admin/campaigns/${campaign.id}/edit`} className="rounded-lg border px-3 py-1.5 text-sm">Edit</Link><CampaignStatusButton id={campaign.id} status={campaign.status} /><CampaignDeleteButton id={campaign.id} disabled={campaign._count.usages > 0} /></td></tr>)}{!campaigns.length && <tr><td colSpan={5} className="p-6 text-center">No campaigns found.</td></tr>}</tbody></table></div>
    <nav className="flex justify-between"><span>{total} campaigns · Page {page}</span><div className="flex gap-4">{page > 1 && <Link href={`?q=${encodeURIComponent(query)}&page=${page - 1}`}>Previous</Link>}{page * 20 < total && <Link href={`?q=${encodeURIComponent(query)}&page=${page + 1}`}>Next</Link>}</div></nav>
  </div>;
}
