import Link from "next/link";
import { ArrowUpRight, MousePointerClick, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { getSocialTrackingConfiguration } from "@/backend/serverActions/socialTrackingAction";

export const metadata = { title: "Clarity | Traffic" };

export default async function ClarityTrafficPage() {
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, "socialTracking", "view")) {
    return <div className="card">Unauthorized</div>;
  }
  const settingsResult = await getSocialTrackingConfiguration();
  const isConfigured = Boolean(settingsResult.success && settingsResult.data.clarityProjectId);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <header>
        <p className="text-sm font-medium text-primary">Traffic / Behavior analytics</p>
        <h1 className="mt-1 text-2xl font-bold text-text sm:text-3xl">Microsoft Clarity</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">Use Clarity recordings and heatmaps to understand how visitors browse product pages, use the cart, and move through checkout.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {[
          ["Session recordings", "Replay visitor journeys and inspect clicks, scrolling, quick backs, dead clicks, and rage clicks."],
          ["Heatmaps", "Compare click and scroll activity across product, cart, and checkout pages on desktop and mobile."],
        ].map(([title, description]) => (
          <article key={title} className="rounded-2xl border border-border bg-surface p-5">
            <MousePointerClick className="text-primary" size={22} />
            <h2 className="mt-3 font-semibold text-text">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-text-muted">{description}</p>
          </article>
        ))}
      </section>

      <section className={`rounded-2xl border p-5 sm:p-6 ${isConfigured ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-amber-600" size={21} />
          <div>
            <h2 className="font-semibold text-text">{isConfigured ? "Clarity Project ID is configured" : "Clarity setup is not connected yet"}</h2>
            <p className="mt-1 text-sm leading-6 text-text-muted">{isConfigured ? "The tracker is configured to load asynchronously after the page is idle. Open the Clarity workspace to review recordings and heatmaps." : "Create or select the BD Mart 24 project in Clarity and save its Project ID under Traffic → Tracking Settings. Before enabling recordings, verify masking for account, address, and checkout details and update the site privacy notice as needed."}</p>
            <a href="https://clarity.microsoft.com/" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              Open Microsoft Clarity <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-border bg-surface p-5 text-sm text-text-muted">
        Clarity recordings and heatmaps are viewed in the Clarity workspace. This admin page links to the workspace and shows setup status; it does not embed Clarity reports.
      </div>
      <Link className="button" href="/admin/traffic">Back to Traffic overview</Link>
    </main>
  );
}
