import Link from "next/link";

export const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100";
export const buttonClass = "inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:opacity-50";
export const secondaryButtonClass = "inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50";

export function Panel({ title, action, children }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    {(title || action) && <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">{title}</h2>{action}</div>}
    {children}
  </section>;
}

export function Feedback({ searchParams }) {
  if (searchParams?.error) return <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{searchParams.error}</p>;
  if (searchParams?.notice) return <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{searchParams.notice}</p>;
  return null;
}

export function Empty({ children }) { return <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{children}</p>; }
export function Field({ label, children }) { return <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>; }
export function Status({ value }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${["ACTIVE", "TRIALING"].includes(value) ? "bg-emerald-100 text-emerald-800" : value === "PAST_DUE" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{value || "FREE"}</span>; }
export function Pager({ path, page, hasMore, query = "" }) { return <div className="mt-5 flex items-center justify-between text-sm"><span>Page {page}</span><div className="flex gap-2">{page > 1 && <Link className={secondaryButtonClass} href={`${path}?page=${page - 1}${query}`}>Previous</Link>}{hasMore && <Link className={secondaryButtonClass} href={`${path}?page=${page + 1}${query}`}>Next</Link>}</div></div>; }
export function DateValue({ value }) { return value ? <time dateTime={new Date(value).toISOString()}>{new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(new Date(value))}</time> : <span>—</span>; }
export function TableWrap({ children }) { return <div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table></div>; }
export function Th({ children }) { return <th className="border-b border-slate-200 px-3 py-3 font-semibold text-slate-600">{children}</th>; }
export function Td({ children }) { return <td className="border-b border-slate-100 px-3 py-3 align-top text-slate-700">{children}</td>; }
