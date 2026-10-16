"use client";

import { Filter, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const empty = { minPrice: "", maxPrice: "", variation: "", variationOptions: [], inStock: false, rating: "" };

export default function ProductFilters({ baseHref, queryString = "", activeFilters = {}, variationOptions = [], onApply, onClear }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(empty);
  const appliedCount = useMemo(() => [activeFilters.minPrice, activeFilters.maxPrice, activeFilters.variation, activeFilters.inStock, activeFilters.rating].filter(Boolean).length + (activeFilters.variationOptions?.length || 0), [activeFilters]);

  useEffect(() => {
    setValues({
      minPrice: activeFilters.minPrice || "",
      maxPrice: activeFilters.maxPrice || "",
      variation: activeFilters.variation || "",
      variationOptions: activeFilters.variationOptions || [],
      inStock: Boolean(activeFilters.inStock),
      rating: activeFilters.rating || "",
    });
  }, [activeFilters]);

  const apply = () => {
    if (onApply) {
      onApply({ ...values, minPrice: values.minPrice, maxPrice: values.maxPrice });
      setOpen(false);
      return;
    }
    const params = new URLSearchParams(queryString);
    params.delete("cursor");
    for (const key of ["minPrice", "maxPrice", "variation", "variant", "rating", "inStock"]) params.delete(key);
    if (values.minPrice) params.set("minPrice", values.minPrice);
    if (values.maxPrice) params.set("maxPrice", values.maxPrice);
    for (const option of values.variationOptions) params.append("variant", `${option.variationNameId}:${option.variationValueId}`);
    if (values.rating) params.set("rating", values.rating);
    if (values.inStock) params.set("inStock", "1");
    const search = params.toString();
    router.push(`${baseHref}${search ? `?${search}` : ""}`, { scroll: false });
    setOpen(false);
  };

  const clear = () => {
    setValues(empty);
    if (onClear) {
      onClear();
      setOpen(false);
      return;
    }
    const params = new URLSearchParams(queryString);
    for (const key of ["minPrice", "maxPrice", "variation", "variant", "rating", "inStock", "cursor"]) params.delete(key);
    const search = params.toString();
    router.push(`${baseHref}${search ? `?${search}` : ""}`, { scroll: false });
    setOpen(false);
  };

  const fieldClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary";
  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-text shadow-sm" aria-label="Open product filters">
      <Filter size={17} /> Filter {appliedCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs text-white">{appliedCount}</span>}
    </button>
    {open && <div className="fixed inset-0 z-[100] bg-black/40" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="product-filter-title" className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="product-filter-title" className="text-lg font-bold text-text">Filter products</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-muted"><X size={20} /></button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <fieldset><legend className="mb-2 text-sm font-semibold text-text">Price range (৳)</legend><div className="grid grid-cols-2 gap-3"><input className={fieldClass} type="number" min="0" inputMode="numeric" placeholder="Minimum" value={values.minPrice} onChange={(event) => setValues((current) => ({ ...current, minPrice: event.target.value }))} /><input className={fieldClass} type="number" min="0" inputMode="numeric" placeholder="Maximum" value={values.maxPrice} onChange={(event) => setValues((current) => ({ ...current, maxPrice: event.target.value }))} /></div></fieldset>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-text"><input type="checkbox" className="h-4 w-4 accent-primary" checked={values.inStock} onChange={(event) => setValues((current) => ({ ...current, inStock: event.target.checked }))} /> In stock only</label>
          {variationOptions.length > 0 && <div className="space-y-4"><h3 className="text-sm font-semibold text-text">Product options</h3>{Object.entries(variationOptions.reduce((groups, option) => { (groups[option.variationNameId] ||= { name: option.name, options: [] }).options.push(option); return groups; }, {})).map(([nameId, group]) => <fieldset key={nameId}><legend className="mb-2 text-sm font-medium text-text">{group.name}</legend><div className="space-y-2">{group.options.map((option) => { const checked = values.variationOptions.some((selected) => selected.variationNameId === option.variationNameId && selected.variationValueId === option.variationValueId); return <label key={option.key} className="flex min-h-9 items-center gap-3 text-sm text-text"><input type="checkbox" className="h-4 w-4 accent-primary" checked={checked} onChange={(event) => setValues((current) => ({ ...current, variationOptions: event.target.checked ? [...current.variationOptions, { variationNameId: option.variationNameId, variationValueId: option.variationValueId }] : current.variationOptions.filter((selected) => !(selected.variationNameId === option.variationNameId && selected.variationValueId === option.variationValueId)) }))} />{option.name}: {option.value}</label>; })}</div></fieldset>)}</div>}
          <label className="block text-sm font-semibold text-text">Review rating<select className={`${fieldClass} mt-2`} value={values.rating} onChange={(event) => setValues((current) => ({ ...current, rating: event.target.value }))}><option value="">Any rating</option><option value="4">Has a 4+ star review</option><option value="3">Has a 3+ star review</option><option value="2">Has a 2+ star review</option><option value="1">Has a 1+ star review</option></select></label>
        </div>
        <footer className="flex gap-3 border-t border-border p-4"><button type="button" onClick={clear} className="min-h-11 flex-1 rounded-xl border border-border px-4 text-sm font-semibold text-text">Clear</button><button type="button" onClick={apply} className="min-h-11 flex-1 rounded-xl bg-primary px-4 text-sm font-semibold text-white">Apply filters</button></footer>
      </section>
    </div>}
  </>;
}
