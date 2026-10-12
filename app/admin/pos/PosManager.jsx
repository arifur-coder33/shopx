"use client";

import { createPosSale, searchPosProducts } from "@/backend/serverActions/posAction";
import { CheckCircle2, Minus, Package, Plus, Printer, RotateCcw, Search, ShoppingCart, Warehouse, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "react-toastify";

const field = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary";
const money = (value) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(value || 0);
const receiptMoney = (value) => `Tk ${Number(value || 0).toFixed(2)}`;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);

function printPosReceipt(receipt, siteSetting) {
  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) return false;
  const shopName = siteSetting?.name || process.env.NEXT_PUBLIC_NEXT_SHOP_NAME || "Shop";
  const address = [siteSetting?.adress1, siteSetting?.adress2].filter(Boolean).join(", ");
  const phones = [siteSetting?.phoneNumber1, siteSetting?.phoneNumber2].filter(Boolean).join(", ");
  const rows = receipt.items.map((item) => `<tr><td><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.sku)} · ${receiptMoney(item.price)} × ${item.quantity}</small></td><td>${receiptMoney(item.total)}</td></tr>`).join("");
  printWindow.document.write(`<!doctype html><html><head><title>Receipt ${escapeHtml(receipt.orderNo)}</title><style>
    @page { size: 80mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body { width: 74mm; margin: 0 auto; color: #111; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.35; }
    h1 { margin: 0; font-size: 19px; } p { margin: 2px 0; } .center { text-align: center; }
    .rule { margin: 8px 0; border-top: 1px dashed #111; } .meta { display: flex; justify-content: space-between; gap: 8px; }
    table { width: 100%; border-collapse: collapse; } td { padding: 4px 0; vertical-align: top; border-bottom: 1px dotted #aaa; }
    td:last-child { width: 25mm; text-align: right; white-space: nowrap; } small { display: block; color: #444; font-weight: normal; }
    .totals div { display: flex; justify-content: space-between; padding: 2px 0; } .grand { margin-top: 3px; padding-top: 5px !important; border-top: 1px solid #111; font-size: 15px; font-weight: bold; }
    .footer { margin-top: 10px; text-align: center; } @media print { body { width: 74mm; } }
  </style></head><body>
    <header class="center"><h1>${escapeHtml(shopName)}</h1>${siteSetting?.slogan ? `<p>${escapeHtml(siteSetting.slogan)}</p>` : ""}${address ? `<p>${escapeHtml(address)}</p>` : ""}${phones ? `<p>Phone: ${escapeHtml(phones)}</p>` : ""}</header>
    <div class="rule"></div><p class="center"><strong>SALES RECEIPT</strong></p>
    <div class="meta"><span>Invoice</span><strong>${escapeHtml(receipt.orderNo)}</strong></div>
    <div class="meta"><span>Date</span><span>${escapeHtml(new Date(receipt.soldAt).toLocaleString("en-BD"))}</span></div>
    <div class="meta"><span>Counter</span><span>${escapeHtml(receipt.warehouseName)}</span></div>
    <div class="rule"></div><table><tbody>${rows}</tbody></table><div class="rule"></div>
    <section class="totals"><div><span>Subtotal</span><span>${receiptMoney(receipt.subtotal)}</span></div>${receipt.discount ? `<div><span>Discount</span><span>-${receiptMoney(receipt.discount)}</span></div>` : ""}${receipt.deliveryCharge ? `<div><span>Delivery</span><span>${receiptMoney(receipt.deliveryCharge)}</span></div>` : ""}<div class="grand"><span>TOTAL</span><span>${receiptMoney(receipt.total)}</span></div><div><span>Received now</span><span>${receiptMoney(receipt.receivedNow)}</span></div>${receipt.codAmount ? `<div><span>Collect by courier (COD)</span><span>${receiptMoney(receipt.codAmount)}</span></div>` : ""}</section>
    <div class="rule"></div><div class="meta"><span>Received via</span><strong>${escapeHtml(`${receipt.accountType} · ${receipt.accountName}`)}</strong></div>
    <div class="meta"><span>Customer</span><span>${escapeHtml(receipt.customerName)}</span></div>${receipt.phoneNumber && receipt.phoneNumber !== "N/A" ? `<div class="meta"><span>Phone</span><span>${escapeHtml(receipt.phoneNumber)}</span></div>` : ""}
    <footer class="footer"><strong>Thank you for shopping with us!</strong><p>Goods sold are subject to store return policy.</p></footer>
  </body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 250);
  return true;
}

function PosTabs({ active, warehouseId, canCreate, canView }) {
  const saleHref = warehouseId ? `/admin/pos?warehouseId=${warehouseId}` : "/admin/pos";
  const listHref = `/admin/pos?tab=sales${warehouseId ? `&warehouseId=${warehouseId}` : ""}`;
  return <nav className="inline-flex rounded-xl bg-surface-muted p-1 text-sm font-bold">{canCreate && <Link href={saleHref} className={`rounded-lg px-4 py-2 ${active === "sale" ? "bg-surface text-primary shadow-sm" : "text-text-muted"}`}>New Sale</Link>}{canView && <Link href={listHref} className={`rounded-lg px-4 py-2 ${active === "sales" ? "bg-surface text-primary shadow-sm" : "text-text-muted"}`}>View Sales</Link>}</nav>;
}

function receiptFromSale(sale, selectedWarehouse) {
  const payment = sale.payments[0];
  const warehouse = sale.deliveries[0]?.warehouse || selectedWarehouse;
  return {
    orderNo: sale.orderNo,
    soldAt: payment?.paidAt || sale.createdAt,
    customerName: sale.customerName,
    phoneNumber: sale.phoneNumber,
    warehouseName: warehouse?.name || "POS Counter",
    warehouseAddress: warehouse?.address || "",
    accountName: payment?.moneyAccount?.name || (sale.paymentMethod === "COD" ? "Courier COD" : "POS payment"),
    accountType: payment?.moneyAccount?.type || (sale.paymentMethod === "COD" ? "COD" : "PAID"),
    subtotal: sale.orderPrice,
    discount: sale.adminDiscount || 0,
    deliveryCharge: sale.deliveryCharge || 0,
    total: Math.max(0, Number(sale.orderPrice || 0) - Number(sale.adminDiscount || 0) + Number(sale.deliveryCharge || 0)),
    receivedNow: sale.paidAmount || 0,
    codAmount: sale.paymentMethod === "COD" ? Number(sale.shipping?.cod || sale.dueAmount || 0) : 0,
    items: sale.orderItems.map((item) => ({ title: item.productName, sku: item.sku, quantity: item.quantity, price: item.price, total: item.price * item.quantity })),
  };
}

function PosSalesView({ result, warehouseId, warehouse, canCreate, canView, canViewOrders }) {
  const [selectedSale, setSelectedSale] = useState(null);
  if (!result?.success) return <main className="space-y-4 p-3 sm:p-5"><PosTabs active="sales" warehouseId={warehouseId} canCreate={canCreate} canView={canView} /><div className="card">{result?.message || "Sales could not be loaded."}</div></main>;
  const ranges = [["TODAY", "Today"], ["YESTERDAY", "Yesterday"], ["THIS_WEEK", "This week"], ["THIS_MONTH", "This month"]];
  const filterHref = (range) => {
    const query = new URLSearchParams({ tab: "sales", range });
    if (warehouseId) query.set("warehouseId", warehouseId);
    return `/admin/pos?${query}`;
  };
  const pageHref = (page) => {
    const query = new URLSearchParams({ tab: "sales", range: result.filters.range, salesPage: String(page) });
    if (warehouseId) query.set("warehouseId", warehouseId);
    if (result.filters.range === "CUSTOM") {
      query.set("startDate", result.filters.startDate);
      query.set("endDate", result.filters.endDate);
    }
    return `/admin/pos?${query}`;
  };
  return <main className="space-y-5 p-3 sm:p-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><PosTabs active="sales" warehouseId={warehouseId} canCreate={canCreate} canView={canView} /><h1 className="mt-3 text-2xl font-bold">POS Sales</h1><p className="text-sm text-text-muted">POS orders from the currently selected warehouse.</p></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-border bg-surface px-4 py-3"><small className="text-text-muted">Orders</small><strong className="block text-xl">{result.summary.count}</strong></div><div className="rounded-xl border border-border bg-surface px-4 py-3"><small className="text-text-muted">Received</small><strong className="block text-xl text-primary">{money(result.summary.total)}</strong></div></div></div>
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-3">
      <div className="flex flex-wrap gap-2">{ranges.map(([value, label]) => <Link key={value} href={filterHref(value)} className={`rounded-full px-3 py-1.5 text-sm font-bold ${result.filters.range === value ? "bg-primary text-white" : "bg-surface-muted text-text-muted"}`}>{label}</Link>)}</div>
      <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><input type="hidden" name="tab" value="sales" />{warehouseId && <input type="hidden" name="warehouseId" value={warehouseId} />}<input type="hidden" name="range" value="CUSTOM" /><label className="text-sm font-semibold">From<input required type="date" name="startDate" defaultValue={result.filters.startDate} className={field} /></label><label className="text-sm font-semibold">To<input required type="date" name="endDate" defaultValue={result.filters.endDate} className={field} /></label><button className="button justify-center">Custom date</button></form>
    </section>
    <div className="responsive-table overflow-hidden rounded-2xl border border-border bg-surface"><table className="min-w-[980px] text-left text-sm"><thead className="bg-surface-muted"><tr><th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Products</th><th className="p-3">Received in</th><th className="p-3">Total</th><th className="p-3">Courier COD</th><th className="p-3">Payment status</th><th className="p-3">Action</th></tr></thead><tbody>{result.data.map((sale) => { const payment = sale.payments[0]; const saleTotal = Math.max(0, Number(sale.orderPrice || 0) - Number(sale.adminDiscount || 0) + Number(sale.deliveryCharge || 0)); const codAmount = sale.paymentMethod === "COD" ? Number(sale.shipping?.cod || sale.dueAmount || 0) : 0; return <tr key={sale.id} className="border-t border-border align-top"><td className="p-3 font-bold">#{sale.orderNo}</td><td className="whitespace-nowrap p-3">{new Date(payment?.paidAt || sale.createdAt).toLocaleString("en-BD")}</td><td className="p-3"><strong>{sale.customerName}</strong>{sale.phoneNumber !== "N/A" && <small className="block text-text-muted">{sale.phoneNumber}</small>}</td><td className="p-3"><strong>{sale.orderItems.reduce((sum, item) => sum + item.quantity, 0)} items</strong><small className="block max-w-60 truncate text-text-muted">{sale.orderItems.map((item) => item.productName).join(", ")}</small></td><td className="p-3">{payment?.moneyAccount ? `${payment.moneyAccount.type} · ${payment.moneyAccount.name}` : "—"}</td><td className="p-3 font-bold">{money(saleTotal)}</td><td className="p-3">{codAmount ? money(codAmount) : "—"}</td><td className="p-3"><span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-bold text-primary">{sale.paymentStatus.replaceAll("_", " ")}</span></td><td className="p-3"><button type="button" onClick={() => setSelectedSale(sale)} className="font-bold text-primary">View</button></td></tr>; })}</tbody></table>{!result.data.length && <p className="p-8 text-center text-text-muted">No POS sales found for this date range.</p>}</div>
    {result.pagination.totalPages > 1 && <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm"><span>Page {result.pagination.page} of {result.pagination.totalPages} · {result.pagination.total} sales</span><div className="flex gap-2"><Link href={pageHref(Math.max(1, result.pagination.page - 1))} className={`button ${result.pagination.page <= 1 ? "pointer-events-none opacity-40" : ""}`}>Previous</Link><Link href={pageHref(Math.min(result.pagination.totalPages, result.pagination.page + 1))} className={`button ${result.pagination.page >= result.pagination.totalPages ? "pointer-events-none opacity-40" : ""}`}>Next</Link></div></div>}
    {selectedSale && (() => { const receipt = receiptFromSale(selectedSale, warehouse); return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3" onClick={() => setSelectedSale(null)}><section role="dialog" aria-modal="true" aria-label={`Sale ${selectedSale.orderNo}`} onClick={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface shadow-2xl"><header className="sticky top-0 flex items-center justify-between border-b border-border bg-surface p-4"><div><h2 className="text-xl font-bold">Invoice #{selectedSale.orderNo}</h2><p className="text-sm text-text-muted">{new Date(receipt.soldAt).toLocaleString("en-BD")}</p></div><button type="button" aria-label="Close sale details" onClick={() => setSelectedSale(null)} className="rounded-full border border-border p-2"><X className="h-4 w-4" /></button></header><div className="space-y-4 p-4"><div className="rounded-xl bg-surface-muted p-3"><p className="font-bold">{receipt.customerName}</p>{receipt.phoneNumber !== "N/A" && <p className="text-sm text-text-muted">{receipt.phoneNumber}</p>}</div><div className="space-y-2">{receipt.items.map((item, index) => <div key={`${item.sku}-${index}`} className="flex justify-between gap-3 border-b border-border pb-2"><span><strong className="block">{item.title}</strong><small className="text-text-muted">{item.sku} · {item.quantity} × {receiptMoney(item.price)}</small></span><strong>{receiptMoney(item.total)}</strong></div>)}</div><div className="space-y-1"><p className="flex justify-between"><span>Subtotal</span><span>{receiptMoney(receipt.subtotal)}</span></p>{receipt.discount > 0 && <p className="flex justify-between"><span>Discount</span><span>-{receiptMoney(receipt.discount)}</span></p>}{receipt.deliveryCharge > 0 && <p className="flex justify-between"><span>Delivery</span><span>{receiptMoney(receipt.deliveryCharge)}</span></p>}<p className="flex justify-between border-t border-border pt-2 text-lg font-black"><span>Total</span><span>{receiptMoney(receipt.total)}</span></p></div><div className={`grid gap-2 ${canViewOrders ? "sm:grid-cols-2" : ""}`}><button type="button" onClick={() => { if (!printPosReceipt(receipt, result.siteSetting)) toast.error("Allow pop-ups to print the receipt."); }} className="button justify-center"><Printer className="h-4 w-4" /> Print invoice</button>{canViewOrders && <Link href={`/admin/order/view/${selectedSale.id}`} className="button justify-center">View full order</Link>}</div></div></section></div>; })()}
  </main>;
}

export default function PosManager({ result, salesResult, canCreate, canView, canViewOrders }) {
  const router = useRouter();
  const initialData = result.success
    ? result.data
    : { warehouses: [], stocks: [], accounts: [], couriers: [] };
  const [cart, setCart] = useState([]);
  const [fulfillment, setFulfillment] = useState("CUSTOMER_PICKUP");
  const [courierId, setCourierId] = useState("");
  const [receivedNow, setReceivedNow] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [deliveryChargeAmount, setDeliveryChargeAmount] = useState("0");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState(initialData.stocks);
  const [productPagination, setProductPagination] = useState(result.pagination);
  const [searching, setSearching] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [pending, startTransition] = useTransition();
  const { warehouses, accounts, couriers, siteSetting } = initialData;
  const warehouseId = result.filters?.warehouseId || "";
  const activeTab = result.filters?.tab === "sales" ? "sales" : "sale";
  const warehouse = warehouses.find((item) => item.id === warehouseId);
  const courier = couriers.find((item) => item.id === courierId);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const saleTotal = Math.max(0, subtotal - (Number(discountAmount) || 0) + (fulfillment === "COURIER" ? Number(deliveryChargeAmount) || 0 : 0));
  const courierCod = Math.max(0, saleTotal - (Number(receivedNow) || 0));
  const cartQuantities = new Map(
    cart.map((item) => [item.variationId, item.quantity]),
  );

  useEffect(() => {
    if (!warehouseId) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      const response = await searchPosProducts({ warehouseId, query: search, page: 1 });
      if (active) {
        if (response.success) {
          setProducts(response.data);
          setProductPagination(response.pagination);
        } else toast.error(response.message);
        setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, warehouseId]);

  if (!result.success) return <main className="p-5"><div className="card">{result.message}</div></main>;

  if (activeTab === "sales") return <PosSalesView result={salesResult} warehouseId={warehouseId} warehouse={warehouse} canCreate={canCreate} canView={canView} canViewOrders={canViewOrders} />;

  if (!warehouse) {
    return <main className="space-y-5 p-4 sm:p-6"><PosTabs active="sale" warehouseId={warehouseId} canCreate={canCreate} canView={canView} /><div><h1 className="text-2xl font-bold">Point of Sale</h1><p className="text-sm text-text-muted">Select the warehouse before starting a direct sale.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{warehouses.map((item) => <Link key={item.id} href={`/admin/pos?warehouseId=${item.id}`} className="card group hover:border-primary"><div className="flex items-start gap-3"><Warehouse className="h-6 w-6 text-primary" /><div><h2 className="font-bold group-hover:text-primary">{item.name}</h2><p className="text-sm text-text-muted">{item.code}</p><p className="mt-2 text-sm">{item.address || "No address"}</p>{item.isDefault && <span className="mt-2 inline-flex rounded-full bg-primary-soft px-2 py-1 text-xs font-bold text-primary">DEFAULT</span>}</div></div></Link>)}</div>{!warehouses.length && <div className="card">Create a warehouse before using POS.</div>}</main>;
  }

  const add = (stock) => setCart((items) => {
    const current = items.find((item) => item.variationId === stock.variation.id);
    if (current) return items.map((item) => item.variationId === stock.variation.id ? { ...item, quantity: Math.min(item.available, item.quantity + 1) } : item);
    return [...items, { variationId: stock.variation.id, title: stock.variation.product?.title || stock.variation.sku, sku: stock.variation.sku, price: Number(stock.variation.discountPrice ?? stock.variation.regularPrice), available: stock.available, quantity: 1 }];
  });
  const quantity = (variationId, change) => setCart((items) => items.map((item) => item.variationId === variationId ? { ...item, quantity: Math.max(0, Math.min(item.available, item.quantity + change)) } : item).filter((item) => item.quantity > 0));
  const setQuantity = (variationId, value) => setCart((items) => items.map((item) => {
    if (item.variationId !== variationId) return item;
    const next = Math.min(item.available, Math.max(1, Number(value) || 1));
    return { ...item, quantity: next };
  }));

  const loadProductPage = async (page) => {
    setSearching(true);
    const response = await searchPosProducts({ warehouseId: warehouse.id, query: search, page });
    setSearching(false);
    if (!response.success) return toast.error(response.message);
    setProducts(response.data);
    setProductPagination(response.pagination);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!cart.length) return toast.error("Add at least one product.");
    if (fulfillment === "COURIER" && courier?.adapterKey === "PATHAO" && !courier.pickupPoints.length) {
      return toast.error("Create a Pathao pickup point before using this courier.");
    }
    const formData = new FormData(event.currentTarget);
    formData.set("warehouseId", warehouse.id);
    formData.set("fulfillment", fulfillment);
    formData.set("items", JSON.stringify(cart.map(({ variationId, quantity: itemQuantity }) => ({ variationId, quantity: itemQuantity }))));
    startTransition(async () => {
      const response = await createPosSale(formData);
      if (!response.success) return toast.error(response.message);
      if (response.data.courierWarning) toast.warning(response.message);
      else toast.success(response.message);
      setCart([]);
      setCompletedSale(response.data);
      router.refresh();
    });
  };

  const startNewSale = () => {
    setCompletedSale(null);
    setFulfillment("CUSTOMER_PICKUP");
    setCourierId("");
    setReceivedNow("0");
    setDiscountAmount("0");
    setDeliveryChargeAmount("0");
    setSearch("");
    startTransition(async () => {
      const response = await searchPosProducts({ warehouseId: warehouse.id, query: "", page: 1 });
      if (!response.success) return toast.error(response.message);
      setProducts(response.data);
      setProductPagination(response.pagination);
    });
  };

  if (completedSale) {
    const receipt = completedSale.receipt;
    return <main className="mx-auto max-w-3xl space-y-5 p-3 sm:p-6">
      <section className="card overflow-hidden p-0">
        <div className="flex flex-col items-center bg-primary-soft px-5 py-7 text-center"><CheckCircle2 className="h-14 w-14 text-primary" /><h1 className="mt-3 text-2xl font-bold">Sale completed</h1><p className="text-sm text-text-muted">Invoice #{receipt.orderNo} · {money(receipt.total)}</p></div>
        <div className="mx-auto max-w-sm p-5 font-mono text-sm">
          <div className="text-center"><h2 className="text-xl font-black">{siteSetting?.name || process.env.NEXT_PUBLIC_NEXT_SHOP_NAME || "Shop"}</h2>{siteSetting?.adress1 && <p className="text-xs text-text-muted">{siteSetting.adress1}</p>}<p className="mt-2 font-bold">SALES RECEIPT</p></div>
          <div className="my-3 border-t border-dashed border-text-muted" />
          <div className="space-y-1 text-xs"><p className="flex justify-between gap-3"><span>Invoice</span><strong>{receipt.orderNo}</strong></p><p className="flex justify-between gap-3"><span>Date</span><span>{new Date(receipt.soldAt).toLocaleString("en-BD")}</span></p><p className="flex justify-between gap-3"><span>Counter</span><span>{receipt.warehouseName}</span></p></div>
          <div className="my-3 border-t border-dashed border-text-muted" />
          <div className="space-y-3">{receipt.items.map((item) => <div key={item.sku} className="flex justify-between gap-3"><span className="min-w-0"><strong className="block break-words">{item.title}</strong><small className="text-text-muted">{item.sku} · {item.quantity} × {receiptMoney(item.price)}</small></span><strong className="shrink-0">{receiptMoney(item.total)}</strong></div>)}</div>
          <div className="my-3 border-t border-dashed border-text-muted" />
          <div className="space-y-1"><p className="flex justify-between"><span>Subtotal</span><span>{receiptMoney(receipt.subtotal)}</span></p>{receipt.discount > 0 && <p className="flex justify-between"><span>Discount</span><span>-{receiptMoney(receipt.discount)}</span></p>}{receipt.deliveryCharge > 0 && <p className="flex justify-between"><span>Delivery</span><span>{receiptMoney(receipt.deliveryCharge)}</span></p>}<p className="mt-2 flex justify-between border-t border-text pt-2 text-lg font-black"><span>TOTAL</span><span>{receiptMoney(receipt.total)}</span></p><p className="flex justify-between"><span>Received now</span><span>{receiptMoney(receipt.receivedNow)}</span></p>{receipt.codAmount > 0 && <p className="flex justify-between font-bold"><span>Courier COD</span><span>{receiptMoney(receipt.codAmount)}</span></p>}</div>
          <div className="my-3 border-t border-dashed border-text-muted" /><p className="flex justify-between gap-3 text-xs"><span>Received via</span><strong>{receipt.accountType} · {receipt.accountName}</strong></p><p className="mt-5 text-center text-xs font-bold">Thank you for shopping with us!</p>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => { if (!printPosReceipt(receipt, siteSetting)) toast.error("Allow pop-ups to print the receipt."); }} className="button justify-center"><Printer className="h-4 w-4" /> Print invoice</button><button type="button" disabled={pending} onClick={startNewSale} className="button justify-center disabled:opacity-50"><RotateCcw className="h-4 w-4" /> {pending ? "Preparing…" : "New sale"}</button></div>
      <Link href={`/admin/order/view/${completedSale.orderId}`} className="block text-center text-sm font-semibold text-primary">View full order</Link>
    </main>;
  }

  return <main className="p-3 sm:p-5">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.7fr)]">
      <section className="order-2 min-w-0 space-y-4 xl:order-1">
        <header className="flex flex-wrap items-end justify-between gap-3"><div><PosTabs active="sale" warehouseId={warehouseId} canCreate={canCreate} canView={canView} /><h1 className="mt-3 text-2xl font-bold">Point of Sale</h1><p className="text-sm text-text-muted">Selling from <strong>{warehouse.name}</strong> · {warehouse.code}</p></div><Link href={`/admin/pos?warehouseId=${warehouseId}`} target="_blank" rel="noopener noreferrer" className="button justify-center"><Plus className="h-4 w-4" /> New Sale</Link></header>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /><input autoFocus className={`${field} pl-10 pr-10`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type product name or SKU…" />{search && <button type="button" aria-label="Clear product search" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"><X className="h-4 w-4" /></button>}</div>
        {searching && <p className="text-sm text-text-muted">Searching products…</p>}
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">{products.map((stock) => { const selectedQuantity = cartQuantities.get(stock.variation.id) || 0; return <button type="button" key={stock.id} onClick={() => add(stock)} className={`group relative flex min-h-48 min-w-0 flex-col overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md active:translate-y-0 active:scale-[0.99] ${selectedQuantity ? "border-primary bg-primary-soft" : "border-border bg-gradient-to-br from-surface via-surface to-surface-muted"}`}>
          <span className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full shadow-sm transition group-hover:scale-110 ${selectedQuantity ? "bg-primary text-white" : "border border-primary/25 bg-surface text-primary"}`}><Plus className="h-5 w-5" /></span>
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Package className="h-6 w-6" /></span>
          <h2 className="max-w-[calc(100%-2.5rem)] break-words text-base font-bold leading-snug text-text">{stock.variation.product?.title}</h2>
          <p className="mt-1 break-all text-xs font-medium text-text-muted">SKU: {stock.variation.sku}</p>
          <div className="mt-auto flex w-full min-w-0 items-end justify-between gap-2 pt-5"><div className="min-w-0"><strong className="block break-words text-lg text-primary">{money(stock.variation.discountPrice ?? stock.variation.regularPrice)}</strong><small className="block text-text-muted">Available {stock.available}</small></div>{selectedQuantity > 0 && <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">In cart: {selectedQuantity}</span>}</div>
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-primary transition-transform group-hover:scale-x-100" />
        </button>; })}</div>
        {!products.length && !searching && <div className="card text-center text-text-muted">No matching available product found in this warehouse.</div>}
        {productPagination?.totalPages > 1 && <div className="flex items-center justify-between"><span className="text-sm text-text-muted">Page {productPagination.page} of {productPagination.totalPages}</span><div className="flex gap-2"><button type="button" disabled={searching || productPagination.page <= 1} className="button disabled:opacity-40" onClick={() => loadProductPage(productPagination.page - 1)}>Previous</button><button type="button" disabled={searching || productPagination.page >= productPagination.totalPages} className="button disabled:opacity-40" onClick={() => loadProductPage(productPagination.page + 1)}>Next</button></div></div>}
      </section>

      <form onSubmit={submit} className="card order-1 h-fit space-y-4 xl:order-2 xl:sticky xl:top-4">
        <div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">Current Sale</h2></div>
        <div className="space-y-2">{cart.map((item) => <div key={item.variationId} className="rounded-xl border border-border p-3"><div className="flex justify-between gap-3"><div><strong className="text-sm">{item.title}</strong><small className="block text-text-muted">{item.sku} · {money(item.price)}</small></div><strong>{money(item.price * item.quantity)}</strong></div><div className="mt-2 flex items-center gap-2"><button type="button" onClick={() => quantity(item.variationId, -1)} className="rounded-lg border p-1"><Minus className="h-4 w-4" /></button><input aria-label={`Quantity for ${item.title}`} type="number" min="1" max={item.available} value={item.quantity} onChange={(event) => setQuantity(item.variationId, event.target.value)} className="w-20 rounded-lg border border-border px-2 py-1 text-center font-bold" /><button type="button" onClick={() => quantity(item.variationId, 1)} className="rounded-lg border p-1"><Plus className="h-4 w-4" /></button><small className="text-text-muted">Max {item.available}</small></div></div>)}{!cart.length && <p className="rounded-xl bg-surface-muted p-4 text-center text-sm text-text-muted">Cart is empty.</p>}</div>
        <div className="flex justify-between border-y border-border py-3 text-lg font-bold"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div className="grid gap-2 sm:grid-cols-2"><label className="text-sm font-semibold">Customer name<input name="customerName" defaultValue="Walk-in customer" className={field} /></label><label className="text-sm font-semibold">Phone<input name="phoneNumber" className={field} /></label><label className="text-sm font-semibold">Discount<input name="discount" type="number" min="0" step="0.01" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} className={field} /></label>{fulfillment === "COURIER" && <label className="text-sm font-semibold">Received now (cash / bKash / Nagad)<input name="receivedNow" type="number" min="0" step="0.01" value={receivedNow} onChange={(event) => setReceivedNow(event.target.value)} className={field} /></label>}<label className="text-sm font-semibold">{fulfillment === "COURIER" ? "Received in account" : "Receive money in"}<select required={fulfillment !== "COURIER" || Number(receivedNow) > 0} name="moneyAccountId" defaultValue={accounts.find((account) => account.type === "CASH")?.id || ""} className={field}><option value="">Select account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.type} · {account.name}</option>)}</select></label></div>
        <fieldset className="space-y-2"><legend className="text-sm font-bold">Fulfillment</legend><div className="grid grid-cols-2 gap-2"><label className={`rounded-xl border p-3 text-center text-sm font-semibold ${fulfillment === "CUSTOMER_PICKUP" ? "border-primary bg-primary-soft text-primary" : "border-border"}`}><input className="sr-only" type="radio" checked={fulfillment === "CUSTOMER_PICKUP"} onChange={() => setFulfillment("CUSTOMER_PICKUP")} />Customer pickup</label><label className={`rounded-xl border p-3 text-center text-sm font-semibold ${fulfillment === "COURIER" ? "border-primary bg-primary-soft text-primary" : "border-border"}`}><input className="sr-only" type="radio" checked={fulfillment === "COURIER"} onChange={() => setFulfillment("COURIER")} />Courier</label></div></fieldset>
        {fulfillment === "COURIER" && <div className="grid gap-2"><label className="text-sm font-semibold">Courier<select required name="courierProviderId" value={courierId} onChange={(event) => setCourierId(event.target.value)} className={field}><option value="">Select courier</option>{couriers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{courier?.pickupPoints?.length > 0 && <label className="text-sm font-semibold">Pickup point<select required={courier.adapterKey === "PATHAO"} name="pickupPointId" className={field}><option value="">Select pickup point</option>{courier.pickupPoints.map((point) => <option key={point.id} value={point.id}>{point.name} · {point.storeId}</option>)}</select></label>}<label className="text-sm font-semibold">Delivery charge<input name="deliveryCharge" type="number" min="0" step="0.01" value={deliveryChargeAmount} onChange={(event) => setDeliveryChargeAmount(event.target.value)} className={field} /></label><p className="flex justify-between rounded-lg bg-surface-muted p-3 text-sm"><span>Courier will collect (COD)</span><strong>{money(courierCod)}</strong></p><label className="text-sm font-semibold">Delivery address<textarea required name="deliveryAddress" rows="2" className={field} /></label><div className="grid grid-cols-2 gap-2"><label className="text-sm font-semibold">Area/Thana<input name="thana" className={field} /></label><label className="text-sm font-semibold">City<input name="city" className={field} /></label></div></div>}
        <label className="text-sm font-semibold">Reference / note<input name="reference" className={field} /></label>
        <button disabled={pending || !cart.length} className="button w-full justify-center disabled:opacity-40">{pending ? "Saving order…" : fulfillment === "COURIER" ? "Confirm order & book courier" : "Complete sale"}</button>
      </form>
    </div>
  </main>;
}
