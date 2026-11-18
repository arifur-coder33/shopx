import { getSupplierLedger } from "@/backend/serverActions/supplierPaymentAction";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const money = (amount) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 2 }).format(Number(amount) || 0);
const date = (value) => new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(new Date(value));

export default async function SupplierLedgerPage({ params, searchParams }) {
  const { supplierId } = await params;
  const query = await searchParams;
  const filters = Object.fromEntries(Object.entries(query || {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  const result = await getSupplierLedger(supplierId, filters);
  if (!result.success) notFound();
  const { supplier, entries } = result.data;
  const selectedFilters = result.data.filters;
  return <main className="space-y-5 p-3 sm:p-5">
    <header><Link href="/admin/accounts/payments" className="text-sm font-semibold text-primary">← Supplier payments</Link><h1 className="mt-2 text-2xl font-bold">{supplier.companyName} · Supplier Ledger</h1><p className="text-sm text-text-muted">Purchase bills, supplier payments, advances, and advance adjustments.</p></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Current payable" value={money(result.data.currentDue)} /><Summary label="Supplier credit / overpayment" value={money(result.data.creditBalance)} /><Summary label="Available advance" value={money(result.data.availableAdvance)} /><Summary label="Net due after advance" value={money(result.data.netDue)} /></section>
    <form method="get" className="grid gap-3 rounded-brand border border-border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-6">
      <label className="grid gap-1 text-sm font-semibold">From<input type="date" name="from" defaultValue={selectedFilters.from} className="rounded-brand border border-border bg-surface px-3 py-2"/></label>
      <label className="grid gap-1 text-sm font-semibold">To<input type="date" name="to" defaultValue={selectedFilters.to} className="rounded-brand border border-border bg-surface px-3 py-2"/></label>
      <label className="grid gap-1 text-sm font-semibold">Transaction type<select name="type" defaultValue={selectedFilters.type} className="rounded-brand border border-border bg-surface px-3 py-2"><option value="ALL">All types</option>{["Opening balance", "Purchase bill", "Supplier advance", "Advance adjusted", "Supplier refund", "Supplier payment"].map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Search reference / PO<input name="search" defaultValue={selectedFilters.search} placeholder="PO number or reference" className="rounded-brand border border-border bg-surface px-3 py-2"/></label>
      <label className="grid gap-1 text-sm font-semibold">Sort by date<select name="sort" defaultValue={selectedFilters.sort} className="rounded-brand border border-border bg-surface px-3 py-2"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
      <div className="flex items-end gap-2"><button className="button min-h-10 flex-1">Apply filters</button><Link href={`/admin/accounts/suppliers/${supplierId}`} className="button min-h-10">Clear</Link></div>
    </form>
    {entries.length ? <div className="responsive-table rounded-brand border border-border bg-surface"><table className="min-w-[850px] text-left text-sm"><thead className="bg-surface-muted"><tr>{["Date", "Type", "Reference", "Bill / payable", "Payment / adjustment", "Due", "Advance available"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody className="divide-y divide-border">{entries.map((entry, index) => <tr key={`${entry.type}-${entry.reference}-${index}`}><td className="px-4 py-3">{date(entry.date)}</td><td className="px-4 py-3 font-semibold">{entry.type}</td><td className="px-4 py-3">{entry.reference}</td><td className="px-4 py-3">{entry.bill ? money(entry.bill) : "—"}</td><td className="px-4 py-3">{entry.payment ? money(entry.payment) : entry.advanceChange > 0 ? `Advance +${money(entry.advanceChange)}` : "—"}</td><td className="px-4 py-3">{money(entry.currentDue)}</td><td className="px-4 py-3">{money(entry.availableAdvance)}</td></tr>)}</tbody></table></div> : <div className="card py-10 text-center text-text-muted">No supplier ledger entries yet.</div>}
  </main>;
}

function Summary({ label, value }) { return <section className="rounded-brand border border-border bg-surface p-4"><p className="text-sm text-text-muted">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></section>; }
