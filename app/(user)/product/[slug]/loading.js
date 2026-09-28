export default function ProductLoading() {
  return (
    <div className="mb-16 animate-pulse pb-20 sm:pb-0" aria-label="পণ্যের তথ্য লোড হচ্ছে">
      <div className="mb-3 h-5 w-48 rounded bg-surface-muted" />
      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface p-2 shadow-sm sm:p-4 md:grid-cols-2 md:gap-6">
        <div className="aspect-square w-full rounded-xl bg-surface-muted" />
        <div className="space-y-5 p-3 sm:p-5">
          <div className="h-9 w-4/5 rounded bg-surface-muted" />
          <div className="h-8 w-2/5 rounded bg-surface-muted" />
          <div className="h-32 rounded-xl bg-surface-muted" />
          <div className="h-12 rounded-xl bg-surface-muted" />
        </div>
      </section>
    </div>
  );
}
