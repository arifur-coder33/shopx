import { storeSignIn } from "@/auth/store";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

async function login(formData) {
  "use server";
  try {
    await storeSignIn("store-credentials", {
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) redirect("/store-login?error=credentials");
    throw error;
  }
}

export default async function StoreLoginPage({ searchParams }) {
  const { error } = (await searchParams) || {};
  return <main className="mx-auto max-w-md p-6"><h1 className="text-2xl font-bold">Store admin sign in</h1>
    <p className="mt-2 text-sm">Sign in on your Store hostname.</p>
    {error && <p role="alert" className="mt-4 text-danger">Unable to sign in with those credentials.</p>}
    <form action={login} className="mt-5 grid gap-4">
      <label>Email<input className="mt-1 w-full rounded border p-2" type="email" name="email" autoComplete="username" required /></label>
      <label>Password<input className="mt-1 w-full rounded border p-2" type="password" name="password" autoComplete="current-password" required /></label>
      <button className="button" type="submit">Sign in</button>
    </form>
  </main>;
}
