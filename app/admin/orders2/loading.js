export default function Orders2Loading() {
  return (
    <section className="mx-auto max-w-7xl animate-pulse space-y-3 p-1 sm:p-2" aria-label="অর্ডার লোড হচ্ছে">
      <header className="rounded-xl border border-border bg-surface p-3 shadow-sm">
        <div className="h-6 w-40 rounded bg-surface-muted" />
        <div className="mt-2 h-3 w-72 max-w-full rounded bg-surface-muted" />
      </header>
      <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-border bg-surface p-3 sm:grid-cols-3">
        <div className="col-span-2 h-11 rounded-xl bg-surface-muted sm:col-span-1" />
        <div className="h-11 rounded-xl bg-surface-muted" />
        <div className="h-11 rounded-xl bg-surface-muted" />
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((card) => (
          <div key={card} className="space-y-3 rounded-xl border border-border bg-surface p-3">
            <div className="h-4 w-2/3 rounded bg-surface-muted" />
            <div className="h-3 w-1/2 rounded bg-surface-muted" />
            <div className="h-10 rounded bg-surface-muted" />
            <div className="h-10 rounded bg-surface-muted" />
          </div>
        ))}
      </div>
    </section>
  );
}
