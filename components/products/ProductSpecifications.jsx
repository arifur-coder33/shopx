export default function ProductSpecifications({ specifications = [] }) {
  const groups = new Map();
  for (const row of specifications) {
    if (!row.value?.trim() || !row.specification) continue;
    const field = row.specification;
    const group = field.parent || field;
    if (!groups.has(group.id)) groups.set(group.id, { name: group.name, rows: [] });
    groups.get(group.id).rows.push({ id: row.id, name: field.parent ? field.name : null, value: row.value });
  }
  if (!groups.size) return null;
  return <section aria-labelledby="product-specifications-title" className="mx-auto my-5 max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface">
    <h2 id="product-specifications-title" className="border-b border-border p-4 text-xl font-bold">Specifications</h2>
    {[...groups.entries()].map(([id, group]) => <div key={id} className="border-b border-border last:border-b-0 sm:grid sm:grid-cols-[10rem_1fr]">
      <h3 className="bg-surface-muted p-3 font-semibold">{group.name}</h3>
      <dl>{group.rows.map((row) => <div key={row.id} className={`border-t border-border p-3 first:border-t-0 ${row.name ? "grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3" : ""}`}>
        <dt className={row.name ? "break-words text-sm text-text-muted" : "sr-only"}>{row.name || group.name}</dt><dd className="whitespace-pre-wrap break-words text-sm">{row.value}</dd>
      </div>)}</dl>
    </div>)}
  </section>;
}
