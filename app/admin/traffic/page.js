import Link from "next/link";
import { Activity, ArrowUpRight, BarChart3, MousePointerClick, Settings2 } from "lucide-react";
import { getSocialTrackingConfiguration } from "@/backend/serverActions/socialTrackingAction";
import { getTrafficReport } from "@/backend/serverActions/trafficReportAction";

export const dynamic = "force-dynamic";

const ranges = [
  ["7daysAgo", "7 days"],
  ["28daysAgo", "28 days"],
  ["90daysAgo", "90 days"],
];
const number = (value) => new Intl.NumberFormat("en-US").format(value || 0);

function Metric({ label, value, detail }) {
  return (
    <article className="rounded-xl border border-border bg-background p-4">
      <div className="text-xs font-medium text-text-muted">{label}</div>
      <div className="mt-2 text-2xl font-bold text-text">{value == null ? "—" : number(value)}</div>
      <div className="mt-1 text-xs text-text-muted">{detail}</div>
    </article>
  );
}

function DataTable({ headers, rows, empty }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-text-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead><tr className="border-b border-border text-xs text-text-muted">{headers.map((header) => <th className="px-3 py-3 font-medium" key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr className="border-b border-border/60 last:border-0" key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td className={`px-3 py-3 ${cellIndex === 0 ? "max-w-[24rem] truncate font-medium text-text" : "text-text-muted"}`} key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default async function TrafficPage({ searchParams }) {
  const params = await searchParams;
  const range = ranges.some(([value]) => value === params?.range) ? params.range : "7daysAgo";
  const [settingsResult, report] = await Promise.all([
    getSocialTrackingConfiguration(),
    getTrafficReport(range),
  ]);
  if (!settingsResult.success) return <div className="card p-5 text-danger">{settingsResult.message}</div>;
  const settings = settingsResult.data;
  const hasGa4Ids = Boolean(settings.googleAnalyticsId && settings.googleAnalyticsPropertyId);
  const reportReady = report.success;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <header className="rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-sky-300"><Activity size={17} /> Store analytics</div>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Traffic overview</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Visitors, page performance, acquisition sources, and ecommerce funnel activity.</p>
          </div>
          <a className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10" href="https://analytics.google.com/" target="_blank" rel="noreferrer">Open GA4 <ArrowUpRight size={15} /></a>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-text-muted">GA4 Realtime active users show visitors active in the last 30 minutes.</div>
        <nav aria-label="Report date range" className="flex rounded-xl border border-border bg-surface p-1">
          {ranges.map(([value, label]) => <Link key={value} href={`/admin/traffic?range=${value}`} className={`rounded-lg px-3 py-1.5 text-sm ${range === value ? "bg-primary text-white" : "text-text-muted hover:text-text"}`}>{label}</Link>)}
        </nav>
      </div>

      {!reportReady && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6">
          <h2 className="font-semibold text-text">GA4 report connection needs setup</h2>
          <p className="mt-1 text-sm leading-6 text-text-muted">{report.message}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link className="button" href="/admin/settings/social-tracking">Add GA4 IDs and service account</Link>
            <a className="inline-flex items-center gap-2 font-semibold text-primary hover:underline" href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com" target="_blank" rel="noreferrer">Enable Analytics Data API <ArrowUpRight size={15} /></a>
          </div>
          {!hasGa4Ids && <p className="mt-3 text-xs text-text-muted">Set the GA4 measurement ID and numeric property ID. The service account JSON key is encrypted in the database.</p>}
        </section>
      )}

      <section aria-label="Traffic metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Active visitors" value={report.data?.activeUsers} detail="Last 30 minutes" />
        <Metric label="Users" value={report.data?.totalUsers} detail="Selected period" />
        <Metric label="Sessions" value={report.data?.sessions} detail="Selected period" />
        <Metric label="Page views" value={report.data?.pageViews} detail="Selected period" />
        <Metric label="Key events" value={report.data?.keyEvents} detail="Selected period" />
      </section>

      {reportReady && report.data.totalUsers === 0 && report.data.sessions === 0 && report.data.pageViews === 0 && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <h2 className="font-semibold text-text">No GA4 traffic data received for this period</h2>
          <p className="mt-1 text-sm leading-6 text-text-muted">The Data API connection is working, but this GA4 property returned no events. Check that the GA4 measurement ID on the site belongs to this property, the updated site version is deployed, and GA4 Realtime shows a visit after opening the storefront.</p>
          <a className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" href="https://analytics.google.com/" target="_blank" rel="noreferrer">Check GA4 Realtime <ArrowUpRight size={15} /></a>
        </section>
      )}

      {reportReady ? (
        <>
          <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-text">Daily traffic</h2>
            <p className="mt-1 text-xs text-text-muted">Page views by day for the selected period.</p>
            <div className="mt-5 overflow-x-auto pb-2">
              <div className="flex h-40 min-w-max items-end gap-2">
                {report.data.trend.map((day) => {
                  const max = Math.max(...report.data.trend.map((item) => item.views), 1);
                  const height = day.views ? Math.max(4, Math.round((day.views / max) * 100)) : 0;
                  return <div className="flex h-full w-9 flex-col items-center justify-end gap-2" key={day.date} title={`${day.date}: ${number(day.views)} views, ${number(day.users)} users`}>
                    <div className="flex h-28 w-full items-end"><div className="w-full rounded-t bg-primary/80" style={{ height: `${height}%` }} /></div>
                    <span className="text-[10px] text-text-muted">{day.date.slice(6, 8)}</span>
                  </div>;
                })}
              </div>
            </div>
          </section>
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-text">Top pages</h2>
              <p className="mt-1 text-xs text-text-muted">Ranked by views during the selected period.</p>
              <DataTable headers={["Page path", "Views", "Users"]} rows={report.data.pages.map((item) => [item.path, number(item.views), number(item.users)])} empty="No page-view data for this period." />
            </article>
            <article className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-text">Traffic sources</h2>
              <p className="mt-1 text-xs text-text-muted">Channel and source/medium that brought sessions.</p>
              <DataTable headers={["Channel", "Source / medium", "Sessions"]} rows={report.data.channels.map((item) => [item.channel, item.source, number(item.sessions)])} empty="No acquisition data for this period." />
            </article>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-text">Shopping funnel</h2>
            <p className="mt-1 text-xs text-text-muted">Standard GA4 ecommerce events; missing event instrumentation appears as zero. This is an aggregate funnel, not an identifiable visitor list.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {report.data.funnel.map((step, index) => {
                const max = Math.max(...report.data.funnel.map((item) => item.count), 1);
                return <div key={step.event} className="rounded-xl border border-border/70 bg-background p-4">
                  <div className="text-xs text-text-muted">Step {index + 1}</div>
                  <div className="mt-1 font-semibold text-text">{step.name}</div>
                  <div className="mt-2 text-xl font-bold text-text">{number(step.count)}</div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(step.count ? 3 : 0, Math.round((step.count / max) * 100))}%` }} /></div>
                </div>;
              })}
            </div>
          </section>
        </>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {[["Top pages", "Page path, page views, and users"], ["Traffic sources", "Channel group, source/medium, and sessions"], ["Shopping funnel", "Product view → add to cart → checkout → purchase"], ["Date ranges", "7, 28, and 90 day reports plus realtime active users"]].map(([title, description]) => <article key={title} className="rounded-2xl border border-border bg-surface p-5"><BarChart3 className="text-primary" size={20} /><h2 className="mt-3 font-semibold text-text">{title}</h2><p className="mt-1 text-sm text-text-muted">{description}</p></article>)}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-text">Microsoft Clarity</h2><p className="mt-1 text-sm text-text-muted">Session recordings, click/scroll heatmaps, and interaction friction.</p></div><MousePointerClick className="shrink-0 text-primary" size={21} /></div>
          <div className="mt-4 flex flex-wrap gap-3"><Link className="button" href="/admin/traffic/clarity">Clarity setup & reports</Link><a className="inline-flex items-center gap-2 self-center text-sm font-semibold text-primary hover:underline" href="https://clarity.microsoft.com/" target="_blank" rel="noreferrer">Open Clarity <ArrowUpRight size={15} /></a></div>
          <p className="mt-3 text-xs text-text-muted">{settings.clarityProjectId ? "Project ID configured. Clarity collects behavior asynchronously." : "Add the Clarity Project ID in Tracking Settings to begin collection."}</p>
        </article>
        <article className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-text">Tracking setup</h2><p className="mt-1 text-sm text-text-muted">GA4, Clarity, Meta, TikTok, and Tag Manager configuration.</p></div><Settings2 className="shrink-0 text-primary" size={21} /></div>
          <div className="mt-4"><Link className="button" href="/admin/settings/social-tracking">Open Tracking Settings</Link></div>
          <p className="mt-3 text-xs text-text-muted">{settings.configuredSecrets.googleAnalyticsServiceAccountJson ? "GA4 reporting service account is saved encrypted." : "GA4 service account key is not configured."}</p>
        </article>
      </section>
    </main>
  );
}
