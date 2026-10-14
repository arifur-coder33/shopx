"use client";

import { searchBarcodeProducts } from "@/backend/serverActions/barcodePrintAction";
import JsBarcode from "jsbarcode";
import { Barcode, Minus, Plus, Printer, Search, Trash2 } from "lucide-react";
import { playScanBeep } from "@/utils/playScanBeep";
import Imagecustom from "@/components/images/ImageCustom";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

const fieldClass = "w-full rounded-brand border border-border bg-surface px-3 py-2 text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function printBarcodeLabels(items) {
  const printWindow = window.open("", "_blank", "width=700,height=850");
  if (!printWindow) return false;

  const labels = items.flatMap((item) => Array.from({ length: Math.max(0, Math.floor(Number(item.quantity) || 0)) }, () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, item.sku, { format: "CODE128", width: 1.6, height: 35, displayValue: true, fontSize: 10, margin: 0 });
    return `<article class="label"><strong class="name">${escapeHtml(item.title)}</strong>${svg.outerHTML}<small>${escapeHtml(item.sku)}</small></article>`;
  })).join("");

  printWindow.document.write(`<!doctype html><html><head><title>Product barcodes</title><style>
    @page { size: 50mm 30mm; margin: 0; } * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; }
    .label { width: 50mm; height: 30mm; padding: 2mm; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; page-break-after: always; }
    .name { max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 9pt; }
    svg { max-width: 45mm; height: 14mm; } small { font-size: 8pt; }
  </style></head><body>${labels}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 250);
  return true;
}

export default function BarcodePrintPage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      setSearchError("");
      return undefined;
    }
    let current = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      const result = await searchBarcodeProducts(term);
      if (!current) return;
      setLoading(false);
      if (result.success) {
        const exactSkuMatch = result.data.find((product) => String(product.sku || "").trim().toLocaleLowerCase() === term.toLocaleLowerCase());
        if (exactSkuMatch) {
          playScanBeep();
          setItems((current) => {
            const existing = current.find((item) => item.id === exactSkuMatch.id);
            if (existing) return current.map((item) => item.id === exactSkuMatch.id ? { ...item, quantity: Number(item.quantity || 0) + 1 } : item);
            return [...current, { ...exactSkuMatch, quantity: 1 }];
          });
          setSearch("");
          setResults([]);
          setSearchError("");
          return;
        }
        setResults(result.data);
        setSearchError("");
      } else {
        setResults([]);
        setSearchError(result.message || "Product search failed.");
      }
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [search]);

  const labelCount = useMemo(() => items.reduce((sum, item) => sum + (Math.max(0, Math.floor(Number(item.quantity) || 0))), 0), [items]);

  const addProduct = (product) => {
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: Number(item.quantity || 0) + 1 } : item);
      return [...current, { ...product, quantity: 1 }];
    });
    setSearch("");
    setResults([]);
  };

  const updateQuantity = (id, quantity) => setItems((current) => current.map((item) => item.id === id ? { ...item, quantity } : item));
  const removeProduct = (id) => setItems((current) => current.filter((item) => item.id !== id));
  const print = () => {
    const printable = items.filter((item) => item.sku && Number(item.quantity) > 0);
    if (!printable.length) {
      toast.error("Add products and set at least one barcode label.");
      return;
    }
    if (!printBarcodeLabels(printable)) toast.error("Allow pop-ups to print barcode labels.");
  };

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-3 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary"><Barcode className="h-6 w-6" /></span>
          <div><p className="text-xs font-bold uppercase tracking-wider text-primary">Inventory Control</p><h1 className="text-2xl font-black text-text">Barcode Print</h1></div>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-2 text-right"><strong className="block text-lg text-text">{labelCount}</strong><span className="text-xs text-text-muted">labels to print</span></div>
      </header>

      <section className="card space-y-3 overflow-visible">
        <label htmlFor="barcode-product-search" className="text-sm font-bold text-text">Add products</label>
        <div className="flex min-h-12 items-center overflow-hidden rounded-brand border border-border bg-background shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="ml-3 h-5 w-5 shrink-0 text-text-muted" />
          <input id="barcode-product-search" autoFocus value={search} onChange={(event) => { setSearch(event.target.value); setResults([]); setSearchError(""); setLoading(event.target.value.trim().length >= 2); }} className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm text-text outline-none placeholder:text-text-muted focus:ring-0" placeholder="Search product name or scan barcode…" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={search.trim().length >= 2} />
        </div>
        {search.trim().length >= 2 && <div className="max-h-80 space-y-1 overflow-y-auto rounded-brand border border-border bg-surface p-1.5 shadow-lg" role="listbox" aria-label="Product search results">
          {loading ? <div className="flex items-center gap-3 px-3 py-4 text-sm text-text-muted"><span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />Searching products…</div>
            : searchError ? <p className="px-3 py-5 text-center text-sm text-red-600">{searchError}</p>
              : results.length ? results.map((product) => <button key={product.id} type="button" role="option" onClick={() => addProduct(product)} className="flex min-h-16 w-full items-center gap-3 rounded-brand px-2 py-2 text-left transition hover:bg-primary-soft">
                {product.thumbnail ? <Imagecustom w={48} h={48} src={product.thumbnail} alt={product.title} className="h-12 w-12 shrink-0 rounded-md border border-border object-cover" unoptimized /> : <div className="h-12 w-12 shrink-0 rounded-md bg-surface-muted" />}
                <span className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-5 text-text">{product.title}<small className="mt-0.5 block truncate text-xs text-text-muted">SKU: {product.sku}</small></span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Plus className="h-4 w-4" /></span>
              </button>)
                : <p className="px-3 py-5 text-center text-sm text-text-muted">No matching products.</p>}
        </div>}
        <p className="text-xs text-text-muted">Barcode scanner দিয়ে SKU scan করলে product নিজে থেকেই list-এ যোগ হবে। একই SKU আবার scan করলে label count এক বাড়বে।</p>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-bold text-text">Print list</h2><span className="text-sm text-text-muted">{items.length} products</span></div>
        {items.length ? <div className="space-y-2">{items.map((item) => <article key={item.id} className="grid gap-3 rounded-xl border border-border bg-surface-muted p-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-center">
          <div className="min-w-0"><strong className="block truncate text-sm text-text">{item.title}</strong><small className="text-text-muted">SKU: {item.sku}</small></div>
          <div className="flex items-center gap-2"><button type="button" aria-label={`Decrease ${item.title} labels`} onClick={() => updateQuantity(item.id, Math.max(0, Number(item.quantity || 0) - 1))} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-text hover:border-primary"><Minus className="h-4 w-4" /></button><input aria-label={`Label count for ${item.title}`} type="number" min="0" step="1" value={item.quantity} onChange={(event) => updateQuantity(item.id, event.target.value)} className={`${fieldClass} min-w-0 text-center`} /><button type="button" aria-label={`Increase ${item.title} labels`} onClick={() => updateQuantity(item.id, Number(item.quantity || 0) + 1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-text hover:border-primary"><Plus className="h-4 w-4" /></button></div>
          <button type="button" onClick={() => removeProduct(item.id)} className="flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /><span className="sm:hidden">Remove</span></button>
        </article>)}</div> : <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center"><Barcode className="mx-auto h-8 w-8 text-text-muted" /><p className="mt-2 font-semibold text-text">No products added yet</p><p className="text-sm text-text-muted">Search by product name or SKU to build a print list.</p></div>}
        <button type="button" disabled={!labelCount} onClick={print} className="button min-h-12 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"><Printer className="h-4 w-4" />Print {labelCount} barcode labels</button>
      </section>
    </main>
  );
}
