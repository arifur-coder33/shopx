export default function StorefrontPageSkeleton({ type = "grid" }) {
  if (type === "product") {
    return (
      <div className="mb-16 animate-pulse" role="status">
        <div className="py-2">
          <div className="h-5 w-52 max-w-[70vw] rounded bg-surface-muted" />
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="aspect-square w-full rounded-xl bg-surface-muted" />
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4].map((thumbnail) => (
                <div
                  key={thumbnail}
                  className="h-[60px] w-[60px] shrink-0 rounded-lg bg-surface-muted"
                />
              ))}
            </div>
          </div>

          <div className="mt-2 space-y-5 md:col-span-2 md:col-start-4 md:mt-0">
            <div className="border-b border-border pb-3">
              <div className="h-10 w-11/12 rounded bg-surface-muted" />
            </div>

            <div className="h-12 w-3/5 rounded bg-surface-muted" />

            <div className="space-y-3">
              <div className="h-5 w-24 rounded bg-surface-muted" />
              <div className="flex gap-2">
                {[1, 2, 3].map((option) => (
                  <div
                    key={option}
                    className="h-11 w-20 rounded-xl bg-surface-muted"
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="h-12 rounded-xl bg-surface-muted" />
              <div className="h-12 rounded-xl bg-primary-soft" />
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <div className="h-5 w-4/5 rounded bg-surface-muted" />
              <div className="h-5 w-3/5 rounded bg-surface-muted" />
            </div>
          </div>
        </div>
        <span className="sr-only">পণ্য লোড হচ্ছে…</span>
      </div>
    );
  }

  if (type === "checkout") {
    return (
      <div className="animate-pulse space-y-3" role="status">
        <div className="h-5 w-36 rounded bg-surface-muted" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((column) => (
            <div key={column} className="space-y-3 rounded-2xl border border-border p-4">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="h-12 rounded-xl bg-surface-muted" />
              ))}
            </div>
          ))}
        </div>
        <span className="sr-only">চেকআউট লোড হচ্ছে…</span>
      </div>
    );
  }

  return (
    <div className="animate-pulse space-y-4" role="status">
      <div className="h-6 w-52 rounded bg-surface-muted" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="space-y-2 rounded-brand border border-border p-2">
            <div className="aspect-square rounded-lg bg-surface-muted" />
            <div className="h-4 rounded bg-surface-muted" />
            <div className="h-4 w-2/3 rounded bg-surface-muted" />
          </div>
        ))}
      </div>
      <span className="sr-only">পেজ লোড হচ্ছে…</span>
    </div>
  );
}
