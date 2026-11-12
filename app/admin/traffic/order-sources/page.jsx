import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireProcurementPermission } from "@/backend/utils/procurement";

export const dynamic = "force-dynamic";

const ranges = [[1, "Today"], [7, "Last 7 days"], [30, "Last 30 days"], [90, "Last 90 days"]];
const number = new Intl.NumberFormat("en-BD");
const money = new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" });

function SourceTable({ title, rows }) {
  return (
    <section className="card space-y-3 p-4">
      <h2 className="font-semibold">{title}</h2>
      {rows.length ? <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left text-sm">
          <thead><tr className="border-b border-border">
            <th className="p-2">Source</th><th className="p-2">Orders</th><th className="p-2">Confirmed or fulfilled</th><th className="p-2">Order value</th>
          </tr></thead>
          <tbody>{rows.map(({ label, orders, confirmed, value }) => (
            <tr key={label} className="border-b border-border/60">
              <td className="break-words p-2">{label}</td><td className="p-2">{number.format(orders)}</td>
              <td className="p-2">{number.format(confirmed)}</td><td className="p-2">{money.format(value)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div> : <p className="text-sm text-text-muted">No matching orders in this period.</p>}
    </section>
  );
}

function summarize(rows, getLabel) {
  const groups = new Map();
  for (const row of rows) {
    const label = getLabel(row);
    const total = groups.get(label) || { label, orders: 0, confirmed: 0, value: 0 };
    total.orders += Number(row.orders);
    total.confirmed += Number(row.confirmed);
    total.value += Number(row.value);
    groups.set(label, total);
  }
  return [...groups.values()].sort((a, b) => b.confirmed - a.confirmed || b.orders - a.orders);
}

export default async function OrderSourcesPage({ searchParams }) {
  await requireProcurementPermission("socialTracking", "view");
  const params = await searchParams;
  const days = ranges.find(([value]) => String(value) === params?.days)?.[0] || 7;
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Dhaka", dateStyle: "short" }).format(new Date());
  const start = new Date(new Date(day + "T00:00:00+06:00").getTime() - (days - 1) * 86400000);
  const rows = await prisma.$queryRaw`
    SELECT COALESCE(NULLIF("marketingAttribution"->>'channel', ''), 'Unattributed') AS channel,
           "marketingAttribution"->>'source' AS source,
           "marketingAttribution"->>'campaign' AS campaign,
           "marketingAttribution"->>'campaignId' AS "campaignId",
           "marketingAttribution"->>'ad' AS ad,
           "marketingAttribution"->>'adId' AS "adId",
           COUNT(*) AS orders,
           COUNT(*) FILTER (WHERE status::text IN ('PROCESSING','READY_TO_SHIP','SHIPPED','DELIVERED')) AS confirmed,
           COALESCE(SUM(GREATEST(0, "orderPrice" - COALESCE("adminDiscount", 0)))
             FILTER (WHERE status::text IN ('PROCESSING','READY_TO_SHIP','SHIPPED','DELIVERED')), 0) AS value
    FROM "Order"
    WHERE "createdAt" >= ${start} AND status::text <> 'CANCELLED'
    GROUP BY 1, 2, 3, 4, 5, 6
  `;
  const paid = rows.filter((row) => row.channel === "Paid Ads");
  return (
    <main className="space-y-5">
      <header className="card space-y-2 p-5">
        <h1 className="text-2xl font-bold">Order Sources</h1>
        <p className="text-sm text-text-muted">Orders by acquisition source. Order value is confirmed or fulfilled merchandise value. Dates use Dhaka time.</p>
        <nav aria-label="Date range" className="flex flex-wrap gap-2">
          {ranges.map(([value, label]) => <Link key={value} href={"/admin/traffic/order-sources?days=" + value} aria-current={days === value ? "page" : undefined} className={"button " + (days === value ? "bg-primary text-white" : "")}>{label}</Link>)}
        </nav>
      </header>
      <SourceTable title="Channels and sources" rows={summarize(rows, (row) => [row.channel, row.source].filter(Boolean).join(" / "))} />
      <SourceTable title="Paid campaigns and ads" rows={summarize(paid, (row) => [
        row.source || "Unknown platform",
        [row.campaign, row.campaignId].filter(Boolean).join(" · ") || "Unknown campaign",
        [row.ad, row.adId].filter(Boolean).join(" · ") || "Unknown ad",
      ].join(" / "))} />
    </main>
  );
}
