export default function ProductDescription({ description }) {
  const optimizedDescription = String(description || "কোন বিবরণ নেই").replace(
    /<img\b([^>]*)>/gi,
    (tag, attributes) => {
      const loading = /\bloading\s*=/i.test(attributes)
        ? ""
        : ' loading="lazy"';
      const decoding = /\bdecoding\s*=/i.test(attributes)
        ? ""
        : ' decoding="async"';
      return `<img${loading}${decoding}${attributes}>`;
    },
  );

  return (
    <section className="mx-auto mt-8 max-w-5xl rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="mb-4 border-b border-border pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-hover">
          বিস্তারিত তথ্য
        </p>
        <h2 className="text-xl font-bold sm:text-2xl">পণ্যের বিবরণ</h2>
      </div>
      <div
        className="rendered-html w-full max-w-full overflow-hidden break-words text-base leading-8 text-text [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl [&_li]:mb-1 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: optimizedDescription }}
      />
    </section>
  );
}
