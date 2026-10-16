import Link from "next/link";
import { ArrowUpRight, MousePointerClick, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { getSocialTrackingConfiguration } from "@/backend/serverActions/socialTrackingAction";
import { loadClarityInsights } from "@/backend/services/clarityReportingService";

export const metadata = { title: "Clarity | Traffic" };

export default async function ClarityTrafficPage() {
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, "socialTracking", "view")) {
    return <div className="card">Unauthorized</div>;
  }
  const settingsResult = await getSocialTrackingConfiguration();
  const isConfigured = Boolean(settingsResult.success && settingsResult.data.clarityProjectId);
  const hasApiToken = Boolean(settingsResult.success && settingsResult.data.configuredSecrets.clarityApiToken);
  let report = null;
  let reportError = "";
  if (isConfigured && hasApiToken) {
    try {
      report = await loadClarityInsights();
    } catch (error) {
      reportError = error instanceof Error ? error.message : "Clarity insights could not be loaded.";
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <header>
        <p className="text-sm font-medium text-primary">Traffic / Behavior analytics</p>
        <h1 className="mt-1 text-2xl font-bold text-text sm:text-3xl">Microsoft Clarity</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">Use Clarity recordings and heatmaps to understand how visitors browse product pages, use the cart, and move through checkout.</p>
      </header>

      {report && report.length > 0 && <section className="space-y-4">
        <div className="rounded-xl border border-border bg-surface p-4 text-sm text-text-muted">Clarity Data Export insights · last 3 days · cached for up to 6 hours</div>
        {report.map((metric, index) => {
          const rows = Array.isArray(metric.information) ? metric.information : [];
          const columns = [...new Set(rows.flatMap((row) => Object.keys(row || {})))].slice(0, 6);
          return <article key={`${metric.metricName || "metric"}-${index}`} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2"><MousePointerClick className="text-primary" size={19} /><h2 className="font-semibold text-text">{metric.metricName || "Clarity insight"}</h2></div>
            {rows.length && columns.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[32rem] text-left text-sm"><thead><tr className="border-b border-border text-xs text-text-muted">{columns.map((column) => <th key={column} className="px-3 py-2 font-medium">{column}</th>)}</tr></thead><tbody>{rows.slice(0, 20).map((row, rowIndex) => <tr key={rowIndex} className="border-b border-border/60 last:border-0">{columns.map((column) => <td key={column} className="max-w-[24rem] truncate px-3 py-2 text-text-muted">{String(row?.[column] ?? "—")}</td>)}</tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-text-muted">No data returned for this insight.</p>}
          </article>;
        })}
      </section>}

      <section className={`rounded-2xl border p-5 sm:p-6 ${isConfigured ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-amber-600" size={21} />
          <div>
            <h2 className="font-semibold text-text">{isConfigured ? "Clarity Project ID is configured" : "Clarity setup is not connected yet"}</h2>
            <p className="mt-1 text-sm leading-6 text-text-muted">{isConfigured ? "The tracker is configured to load asynchronously after the page is idle. Aggregated insights appear above when the Data Export API token is saved." : "Create or select the BD Mart 24 project in Clarity and save its Project ID under Traffic → Tracking Settings. Before enabling recordings, verify masking for account, address, and checkout details and update the site privacy notice as needed."}</p>
            <a href="https://clarity.microsoft.com/" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              Open Microsoft Clarity <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </section>

      {!hasApiToken && isConfigured && <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm text-text-muted"><h2 className="font-semibold text-text">Connect Clarity insights to this admin</h2><p className="mt-1">Create a Data Export API token in Clarity Settings → Data Export, then save it in Traffic → Tracking Settings. The token is encrypted in the database.</p></section>}
      {reportError && <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm text-text-muted"><h2 className="font-semibold text-text">Clarity report unavailable</h2><p className="mt-1">{reportError}</p></section>}
      <div className="rounded-2xl border border-border bg-surface p-5 text-sm text-text-muted">
        Clarity's export API provides aggregated insights, not session playback or heatmap embeds. Use the link above to open recordings and heatmaps in Clarity.
      </div>
      <Link className="button" href="/admin/traffic">Back to Traffic overview</Link>
    </main>
  );
}
