import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { platformAuth } from "@/auth/platform";
import prisma from "@/lib/prisma";
import { getCurrentStoreContext } from "@/backend/services/storeContextService";
import { requirePlatformPermission } from "@/backend/services/identityAuthorization.server";
import { platformLogoutAction } from "@/backend/serverActions/platformConsoleActions";

export default async function PlatformConsoleLayout({ children }) {
  const context = await getCurrentStoreContext();
  if (context.type !== "PLATFORM") notFound();
  const session = await platformAuth();
  if (session?.user?.identityType !== "PLATFORM_MEMBER") redirect("/platform/login");
  await requirePlatformPermission("PLATFORM", "VIEW");
  const member = await prisma.platformMember.findFirst({ where: { id: session.user.platformMemberId, roleId: session.user.roleId, status: "ACTIVE" },
    select: { name: true, email: true, role: { select: { name: true, status: true, permissions: { select: { resource: true, action: true } } } } } });
  if (!member || member.role.status !== "ACTIVE") redirect("/platform/login");
  const allowed = (resource, action = "VIEW") => member.role.permissions.some((permission) => permission.resource === resource && permission.action === action);
  const links = [
    ["Dashboard", "/platform", "PLATFORM", "VIEW"], ["Stores", "/platform/stores", "STORES", "VIEW"],
    ["Plans", "/platform/plans", "BILLING", "VIEW"], ["Subscriptions", "/platform/subscriptions", "BILLING", "VIEW"],
    ["Members", "/platform/members", "PLATFORM", "MANAGE"], ["Settings", "/platform/settings", "PLATFORM", "VIEW"],
  ].filter((item) => allowed(item[2], item[3]));
  const nav = <nav aria-label="Platform navigation" className="grid gap-1">{links.map(([label, href]) => <Link key={href} href={href} className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white">{label}</Link>)}</nav>;
  return <div className="min-h-screen bg-slate-100 text-slate-900 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
    <aside className="hidden min-h-screen bg-slate-950 p-5 lg:block"><Link href="/platform" className="mb-9 block text-xl font-black tracking-tight text-white">Shopz <span className="text-indigo-400">Platform</span></Link>{nav}</aside>
    <div className="min-w-0"><header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6"><div className="flex items-center justify-between gap-4"><Link href="/platform" className="font-black lg:hidden">Shopz Platform</Link><div className="hidden lg:block"><p className="text-sm font-semibold">Platform Console</p><p className="text-xs text-slate-500">{member.role.name}</p></div><div className="flex items-center gap-3"><span className="hidden text-right text-xs text-slate-600 sm:block"><strong className="block text-slate-900">{member.name}</strong>{member.email}</span><form action={platformLogoutAction}><button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50">Log out</button></form></div></div><details className="mt-3 lg:hidden"><summary className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Menu</summary><div className="mt-2 rounded-xl bg-slate-950 p-3">{nav}</div></details></header><main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">{children}</main></div>
  </div>;
}
