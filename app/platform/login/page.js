import { notFound, redirect } from "next/navigation";
import { platformAuth } from "@/auth/platform";
import { getCurrentStoreContext } from "@/backend/services/storeContextService";
import PlatformLoginForm from "../_components/PlatformLoginForm";

export const metadata = { title: "Platform sign in" };

export default async function PlatformLoginPage() {
  const context = await getCurrentStoreContext();
  if (context.type !== "PLATFORM") notFound();
  const session = await platformAuth();
  if (session?.user?.identityType === "PLATFORM_MEMBER") redirect("/platform");
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9"><p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-700">Shopz Platform</p><h1 className="mt-3 text-3xl font-bold text-slate-950">Welcome back</h1><p className="mb-7 mt-2 text-sm text-slate-600">PlatformMembers only. Store accounts use a separate sign-in.</p><PlatformLoginForm /></div></main>;
}
