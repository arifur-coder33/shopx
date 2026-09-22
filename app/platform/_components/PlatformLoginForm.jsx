"use client";

import { useActionState } from "react";
import { platformLoginAction } from "@/backend/serverActions/platformConsoleActions";

export default function PlatformLoginForm() {
  const [state, action, pending] = useActionState(platformLoginAction, null);
  return <form action={action} className="space-y-4">
    {state?.error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}
    <label className="block text-sm font-semibold text-slate-700">Email<input required type="email" name="email" autoComplete="username" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-indigo-600 focus:outline-none" /></label>
    <label className="block text-sm font-semibold text-slate-700">Password<input required type="password" name="password" autoComplete="current-password" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-indigo-600 focus:outline-none" /></label>
    <button disabled={pending} type="submit" className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white hover:bg-indigo-800 disabled:opacity-60">{pending ? "Signing in…" : "Sign in to Shopz Platform"}</button>
  </form>;
}
