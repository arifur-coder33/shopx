"use client";

import { useEffect, useState } from "react";
import ComboProductPicker from "./ComboProductPicker";
import FloatingInput from "@/components/input/FloatingInput";
import { searchCampaignTargets } from "@/backend/serverActions/campaignAction";

function ComboCategoryPicker({ index, categories, selectedIds, setSelectedIds }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(categories);
  const [knownCategories, setKnownCategories] = useState(categories);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setKnownCategories((current) => [...new Map([...current, ...categories].map((item) => [item.id, item])).values()]);
  }, [categories]);

  useEffect(() => {
    let current = true;
    const search = query.trim();
    if (search.length < 2) {
      setResults(categories);
      setSearching(false);
      setError("");
      return () => { current = false; };
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const result = await searchCampaignTargets("category", search);
      if (!current) return;
      const found = result.success ? result.data : [];
      setResults(found);
      if (result.success) setKnownCategories((known) => [...new Map([...known, ...found].map((item) => [item.id, item])).values()]);
      setError(result.success ? "" : result.message || "Could not search categories.");
      setSearching(false);
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [query, categories]);

  const toggle = (id) => setSelectedIds(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  const selected = knownCategories.filter((category) => selectedIds.includes(category.id));
  return <div className="space-y-2">
    {selected.length > 0 && <div className="flex flex-wrap gap-2">{selected.map((category) => <button type="button" key={category.id} onClick={() => toggle(category.id)} className="rounded-full border border-primary bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary">{category.parentCategory?.name ? category.parentCategory.name + " / " : ""}{category.name} ×</button>)}</div>}
    <FloatingInput name={"pair-category-search-" + index} label="Search categories" colSpan="1" value={query} onChange={(event) => setQuery(event.target.value)} />
    <p className="text-xs text-text-muted">{query.trim().length < 2 ? "Showing the first 10 categories. Search for more." : searching ? "Searching categories…" : "Search results from all categories."}</p>
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
      {results.map((category) => {
        const active = selectedIds.includes(category.id);
        return <label key={category.id} className={"flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm " + (active ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50")}>
          <input type="checkbox" checked={active} onChange={() => toggle(category.id)} />
          <span>{category.parentCategory?.name ? category.parentCategory.name + " / " : ""}{category.name}</span>
        </label>;
      })}
      {!results.length && <p className="p-3 text-sm text-text-muted">No matching category.</p>}
    </div>
    <p className="text-xs text-text-muted">{selectedIds.length} categories selected</p>
  </div>;
}

export default function ComboPairEditor({ products, categories, initialPairs = [], onChange }) {
  const [pairs, setPairs] = useState(initialPairs.length ? initialPairs.map((pair) => ({
    triggerType: ["ALL", "PRODUCT", "CATEGORY"].includes(pair.triggerType) ? pair.triggerType : "PRODUCT",
    requiredProductIds: pair.requiredProductIds || (pair.requiredProductId ? [pair.requiredProductId] : []),
    requiredCategoryIds: pair.requiredCategoryIds || (pair.requiredCategoryId ? [pair.requiredCategoryId] : []),
    rewardProductIds: pair.rewardProductIds?.length ? pair.rewardProductIds : (pair.rewardProductId ? [pair.rewardProductId] : []),
  })) : [{ triggerType: "ALL", requiredProductIds: [], requiredCategoryIds: [], rewardProductIds: [] }]);
  const update = (next) => { setPairs(next); onChange(next); };
  const setField = (index, field, value) => update(pairs.map((pair, i) => i === index ? { ...pair, [field]: value } : pair));
  const complete = (pair) => pair.rewardProductIds.length > 0 && (pair.triggerType === "ALL" || (pair.triggerType === "PRODUCT" ? pair.requiredProductIds.length > 0 : pair.requiredCategoryIds.length > 0));

  return <div className="space-y-4 md:col-span-2">
    <input type="hidden" name="productPairs" value={JSON.stringify(pairs.filter(complete))} readOnly />
    <div><h4 className="text-sm font-medium">Buy condition and reward</h4><p className="text-xs text-text-muted">Choose any product, one or more specific products (any one can trigger it), or multiple categories for each rule, then select one or more reward products.</p></div>
    {pairs.map((pair, index) => <section key={index} className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between"><h5 className="text-sm font-semibold">Rule {index + 1}</h5>{pairs.length > 1 && <button type="button" onClick={() => update(pairs.filter((_, i) => i !== index))} className="text-sm text-red-600">Remove rule</button>}</div>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">When customer buys</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name={"triggerType-" + index} checked={pair.triggerType === "ALL"} onChange={() => update(pairs.map((item, i) => i === index ? { ...item, triggerType: "ALL", requiredProductIds: [], requiredCategoryIds: [] } : item))} /> Any product</label>
          <label className="flex items-center gap-2"><input type="radio" name={"triggerType-" + index} checked={pair.triggerType === "PRODUCT"} onChange={() => update(pairs.map((item, i) => i === index ? { ...item, triggerType: "PRODUCT", requiredCategoryIds: [] } : item))} /> Specific product(s)</label>
          <label className="flex items-center gap-2"><input type="radio" name={"triggerType-" + index} checked={pair.triggerType === "CATEGORY"} onChange={() => update(pairs.map((item, i) => i === index ? { ...item, triggerType: "CATEGORY", requiredProductIds: [] } : item))} /> Product(s) in category</label>
        </div>
        {pair.triggerType === "PRODUCT" && <ComboProductPicker name={"pair-required-" + index} label="Required products" products={products} selectedIds={pair.requiredProductIds} setSelectedIds={(ids) => setField(index, "requiredProductIds", ids)} />}
        {pair.triggerType === "CATEGORY" && <ComboCategoryPicker index={index} categories={categories} selectedIds={pair.requiredCategoryIds} setSelectedIds={(ids) => setField(index, "requiredCategoryIds", ids)} />}
        {pair.triggerType === "ALL" && <p className="text-xs text-text-muted">The rule can be triggered by any product in the cart.</p>}
      </fieldset>
      <div><h5 className="mb-2 text-sm font-medium">Reward products</h5><ComboProductPicker name={"pair-reward-" + index} label="Reward products" products={products} selectedIds={pair.rewardProductIds} setSelectedIds={(ids) => setField(index, "rewardProductIds", ids)} /></div>
    </section>)}
    <button type="button" onClick={() => update([...pairs, { triggerType: "ALL", requiredProductIds: [], requiredCategoryIds: [], rewardProductIds: [] }])} className="rounded-lg border px-3 py-2 text-sm">+ Add another rule</button>
  </div>;
}
