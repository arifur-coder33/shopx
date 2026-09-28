export default function Order2DetailLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-5 p-3 sm:p-6" aria-label="অর্ডার লোড হচ্ছে">
      <div className="h-7 w-36 rounded-lg bg-surface-muted" />
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="h-7 w-56 rounded bg-surface-muted" />
        <div className="mt-3 h-4 w-40 rounded bg-surface-muted" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <div className="h-5 w-32 rounded bg-surface-muted" />
          {[1, 2, 3].map((row) => <div key={row} className="flex gap-3 border-t border-border py-4"><div className="h-14 w-14 rounded-lg bg-surface-muted" /><div className="flex-1 space-y-2"><div className="h-4 w-2/3 rounded bg-surface-muted" /><div className="h-3 w-1/3 rounded bg-surface-muted" /></div></div>)}
        </div>
        <div className="h-64 rounded-2xl border border-border bg-surface" />
      </div>
    </div>
  );
}
