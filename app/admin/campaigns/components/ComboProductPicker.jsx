"use client";

import { useEffect, useState } from "react";
import { searchCampaignTargets } from "@/backend/serverActions/campaignAction";
import FloatingInput from "@/components/input/FloatingInput";
import ImageCustom from "@/components/images/ImageCustom";

export default function ComboProductPicker({ name, label, products, selectedIds, setSelectedIds, single = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(products);
  const [knownProducts, setKnownProducts] = useState(products);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    setKnownProducts((current) => [...new Map([...current, ...products].map((product) => [product.id, product])).values()]);
  }, [products]);

  useEffect(() => {
    let current = true;
    const search = query.trim();
    if (search.length < 2) {
      setResults(products);
      setSearching(false);
      setSearchError("");
      return () => { current = false; };
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const result = await searchCampaignTargets("product", search);
      if (!current) return;
      const found = result.success ? result.data : [];
      setResults(found);
      if (result.success) setKnownProducts((known) => [...new Map([...known, ...found].map((product) => [product.id, product])).values()]);
      setSearchError(result.success ? "" : result.message || "Could not search products.");
      setSearching(false);
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [query, products]);

  const selectedProducts = knownProducts.filter((product) => selectedIds.includes(product.id));
  const toggle = (id) => setSelectedIds(single ? (selectedIds.includes(id) ? [] : [id]) : (selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]));

  return <div className="space-y-2 md:col-span-2">
    <input type="hidden" name={name} value={JSON.stringify(selectedIds)} readOnly />
    <div><h4 className="text-sm font-medium">{label}</h4><p className="text-xs text-text-muted">Search and select products. Click a selected product to remove it.</p></div>
    {selectedProducts.length > 0 && <div className="flex flex-wrap gap-2" aria-label={selectedProducts.length + " selected products"}>
      {selectedProducts.map((product) => <button key={product.id} type="button" onClick={() => toggle(product.id)} className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary bg-primary-soft px-3 py-1.5 text-left text-xs font-medium text-primary"><span className="truncate">{product.title}</span><span aria-hidden="true">×</span><span className="sr-only">Remove {product.title}</span></button>)}
    </div>}
    <FloatingInput name={name + "-search"} label={"Search " + label.toLowerCase()} colSpan="1" value={query} onChange={(event) => setQuery(event.target.value)} />
    <p className="text-xs text-text-muted">{query.trim().length < 2 ? "Showing the first 10 products. Search for more products." : searching ? "Searching products…" : "Search results from all products."}</p>
    {searchError && <p role="alert" className="text-xs text-red-600">{searchError}</p>}
    <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
      {results.map((product) => {
        const selected = selectedIds.includes(product.id);
        const prices = (product.variations || []).map((variation) => {
          const regular = Number(variation.regularPrice) || 0;
          const sale = Number(variation.discountPrice) || 0;
          return sale > 0 && sale < regular ? sale : regular;
        }).filter((price) => price > 0);
        const price = prices.length ? Math.min(...prices) : null;
        return <label key={product.id} className={"flex cursor-pointer items-center gap-3 rounded-xl border p-2 transition-colors " + (selected ? "border-primary bg-primary-soft ring-2 ring-primary/20" : "border-border hover:border-primary/50")}>
          <input type="checkbox" checked={selected} onChange={() => toggle(product.id)} className="sr-only" />
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-muted">{product.thumbnail?.name ? <ImageCustom src={product.thumbnail.name} alt={product.title} w={48} h={48} className="h-12 w-12 object-cover" /> : <span className="grid h-full place-items-center text-[10px] text-text-muted">No image</span>}</span>
          <span className="min-w-0 flex-1"><span className="block line-clamp-2 text-sm font-medium">{product.title}</span><span className="mt-1 block text-xs font-semibold text-primary">{price == null ? "Price unavailable" : "৳" + price.toLocaleString()}</span></span>
          <span aria-hidden="true" className={"flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs " + (selected ? "border-primary bg-primary text-white" : "border-border text-transparent")}>✓</span>
        </label>;
      })}
      {!results.length && <p className="p-3 text-sm text-text-muted">No matching product.</p>}
    </div>
    <p className="text-xs text-text-muted">{selectedIds.length} products selected</p>
  </div>;
}
