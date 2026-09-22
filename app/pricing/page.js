import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentStoreContext } from "@/backend/services/storeContextService";

export const metadata = {
  title: "Plans and pricing | Shopz Platform",
  description: "Compare Shopz Store plans and their included features.",
  robots: { index: true, follow: true },
};

const formatPrice = (minor) =>
  minor == null
    ? "Contact us"
    : minor === 0
      ? "Free"
      : new Intl.NumberFormat("en-BD", {
          style: "currency",
          currency: "BDT",
          maximumFractionDigits: 0,
        }).format(minor / 100);

function PlanDetails({ plan }) {
  const features = Object.entries(plan.features || {}).filter(([, enabled]) => enabled === true);
  const limits = Object.entries(plan.limits || {}).filter(([, value]) => Number.isSafeInteger(value));

  return (
    <ul className="mt-6 space-y-2 text-sm text-slate-700">
      {features.map(([name]) => <li key={name}>✓ {name.replaceAll("_", " ")}</li>)}
      {limits.map(([name, value]) => <li key={name}>✓ {name.replaceAll("_", " ")}: {value.toLocaleString("en-BD")}</li>)}
      {!features.length && !limits.length && <li>Contact us for plan details.</li>}
    </ul>
  );
}

export default async function PricingPage() {
  const context = await getCurrentStoreContext();
  if (context.type !== "PLATFORM") notFound();

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: [{ monthlyPriceMinor: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      monthlyPriceMinor: true,
      yearlyPriceMinor: true,
      features: true,
      limits: true,
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/pricing" className="text-xl font-black tracking-tight text-indigo-700">Shopz Platform</Link>
          <Link href="/platform/login" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100">Platform sign in</Link>
        </header>
        <div className="mx-auto mt-12 max-w-2xl text-center sm:mt-20">
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-700">Store plans</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">A plan for every Store</h1>
          <p className="mt-4 text-slate-600">Compare the current plans. Online subscription checkout and self-service Store signup are not available yet.</p>
        </div>
        {plans.length ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <p className="mt-2 min-h-12 text-sm text-slate-600">{plan.description || "A Shopz Store plan."}</p>
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <p className="text-sm text-slate-500">Monthly</p>
                  <p className="text-3xl font-black">{formatPrice(plan.monthlyPriceMinor)}</p>
                  <p className="mt-2 text-sm text-slate-600">Yearly: {formatPrice(plan.yearlyPriceMinor)}</p>
                </div>
                <PlanDetails plan={plan} />
              </article>
            ))}
          </div>
        ) : <p className="mt-12 text-center text-slate-600">No public plans are available yet.</p>}
      </div>
    </main>
  );
}
