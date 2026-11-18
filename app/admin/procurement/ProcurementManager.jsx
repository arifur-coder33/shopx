"use client";

import { createDelivery } from "@/backend/serverActions/deliveryAction";
import { createGoodsReceipt } from "@/backend/serverActions/goodsReceiptAction";
import { adjustStock } from "@/backend/serverActions/inventoryAction";
import { cancelGoodsReceipt, cancelPreparedDelivery } from "@/backend/serverActions/inventoryDocumentCancelAction";
import { createPurchaseOrder, getPurchaseVariationOptions, updatePurchaseStatus } from "@/backend/serverActions/purchaseAction";
import { createWarehouse } from "@/backend/serverActions/warehouseAction";
import Modal from "@/components/modal/Modal";
import SearchableDropdown from "@/components/input/SearchableDropdown";
import FloatingInput from "@/components/input/FloatingInput";
import JsBarcode from "jsbarcode";
import { Plus, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";
import RecordActions from "./[section]/[id]/RecordActions";
import DeliveryPrintActions from "./DeliveryPrintActions";
import PurchaseOrderPDF from "./PurchaseOrderPDF";
import InventoryGuide from "./InventoryGuide";

const money = (value) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 2 }).format(value || 0);
const day = (value) => value ? new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(new Date(value)) : "—";
const fieldClass = "w-full rounded-brand border border-border bg-surface px-3 py-2 text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const purchaseNumberProps = {
  onWheel: (event) => event.currentTarget.blur(),
  onKeyDown: (event) => {
    if (["ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault();
  },
};
const createPurchaseItem = () => ({ rowKey: Math.random().toString(36).slice(2), variationId: "", quantity: 1, unitCost: 0, discount: 0 });
const buttonClass = "button min-h-11 px-4 text-sm";

function FormDialog({ title, open, onClose, action, children, transform, onSuccess, headerAction }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    transform?.(data);
    startTransition(async () => {
      const result = await action(data);
      if (result.success) {
        toast.success(result.message);
        onSuccess?.(result);
        onClose();
        router.refresh();
      } else toast.error(result.message);
    });
  };
  return (
    <Modal isOpen={open} onClose={onClose}>
      <form onSubmit={submit} className="mx-auto w-full max-w-4xl">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-3"><h2 className="text-xl font-bold text-text">{title}</h2>{headerAction}</div>
        {children}
        <button disabled={pending} className={`${buttonClass} mt-5 w-full`} type="submit">
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </Modal>
  );
}

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

function printGoodsReceiptBarcodes(receipt, labelCounts) {
  const printWindow = window.open("", "_blank", "width=600,height=800");
  if (!printWindow) return false;
  const labels = (receipt.items || []).flatMap((item) => Array.from({ length: Math.max(0, Math.floor(Number(labelCounts?.[item.id] ?? item.quantity) || 0)) }, () => {
    const sku = String(item.variation?.sku || "");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, sku, { format: "CODE128", width: 1.6, height: 35, displayValue: true, fontSize: 10, margin: 0 });
    return `<article class="label"><strong class="name">${escapeHtml(item.variation?.product?.title || "Product")}</strong>${svg.outerHTML}<small>${escapeHtml(sku)}</small></article>`;
  })).join("");
  printWindow.document.write(`<!doctype html><html><head><title>Barcodes ${escapeHtml(receipt.grnNo)}</title><style>
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

function Label({ children }) { return <label className="grid gap-1.5 text-sm font-semibold text-text">{children}</label>; }
function DocumentCancelButton({ action, id, label }) { const router = useRouter(); const [pending, start] = useTransition(); return <button type="button" disabled={pending} className="rounded-brand border border-danger px-2 py-1 text-xs font-semibold text-danger disabled:opacity-50" onClick={() => { if (!window.confirm("Cancel this document and reverse its stock movements? Later dependent movements must be cancelled first.")) return; start(async () => { const result = await action(id); if (!result.success) return toast.error(result.message); toast.success(result.message); router.refresh(); }); }}>{pending ? "Cancelling…" : label}</button>; }
function Empty({ children }) { return <div className="card py-12 text-center text-text-muted">{children}</div>; }

export default function ProcurementManager({ initialResult, initialTab = "purchases", allowedTabs = [], basePath = "/admin/procurement" }) {
  const router = useRouter();
  const tab = initialTab;
  const [dialog, setDialog] = useState(null);
  const [barcodeReceipt, setBarcodeReceipt] = useState(null);
  const [barcodeLabelCounts, setBarcodeLabelCounts] = useState({});
  const [poItems, setPoItems] = useState([createPurchaseItem()]);
  const [poVariations, setPoVariations] = useState([]);
  const [poVariationLoading, setPoVariationLoading] = useState(false);
  const [receiptPoId, setReceiptPoId] = useState("");
  const [receiptQty, setReceiptQty] = useState({});
  const [receiptLots, setReceiptLots] = useState({});
  const [deliveryOrderId, setDeliveryOrderId] = useState("");
  const [deliveryWarehouseId, setDeliveryWarehouseId] = useState("");
  const [deliveryItems, setDeliveryItems] = useState({});
  const [pending, startTransition] = useTransition();
  const data = initialResult?.data || { suppliers: [], warehouses: [], purchaseOrders: [], receipts: [], stocks: [], transactions: [], expenses: [], payments: [], moneyAccounts: [], expenseCategories: [], variations: [], pendingPayments: [], deliveries: [], orders: [], batches: [] };
  const openPurchases = data.purchaseOrders.filter((po) => !["RECEIVED", "CANCELLED"].includes(po.status));
  const selectedPo = data.purchaseOrders.find((po) => po.id === receiptPoId);
  const selectedDeliveryOrder = data.orders?.find((order) => order.id === deliveryOrderId);
  const deliveryView = initialResult?.filters?.view === "prepared" ? "prepared" : "queue";

  const variationOptions = useMemo(() => data.variations.map((variation) => ({ ...variation, label: `${variation.sku} — ${variation.product?.title || "Product"}` })), [data.variations]);
  const purchaseVariationOptions = useMemo(() => (poVariations.length ? poVariations : data.variations).map((variation) => ({ ...variation, label: `${variation.sku} — ${variation.product?.title || "Product"}` })), [poVariations, data.variations]);
  const openPurchaseDialog = async () => {
    setDialog("purchase");
    if (!poVariations.length) {
      setPoVariationLoading(true);
      const result = await getPurchaseVariationOptions();
      if (result.success) setPoVariations(result.data);
      else toast.error(result.message);
      setPoVariationLoading(false);
    }
  };
  const setItem = (index, key, value) => setPoItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const addItem = () => setPoItems((items) => [...items, createPurchaseItem()]);
  const removeItem = (index) => setPoItems((items) => items.length === 1 ? [createPurchaseItem()] : items.filter((_, itemIndex) => itemIndex !== index));
  const close = () => setDialog(null);
  const updateStatus = (id, status) => startTransition(async () => {
    const result = await updatePurchaseStatus(id, status);
    result.success ? toast.success(result.message) : toast.error(result.message);
    if (result.success) router.refresh();
  });
  const prepareDelivery = (order) => {
    setDeliveryOrderId(order.id);
    setDeliveryWarehouseId("");
    setDeliveryItems({});
    setDialog("delivery");
  };

  if (!initialResult?.success) return <Empty>{initialResult?.message || "Procurement data could not be loaded."}</Empty>;

  return (
    <section className="space-y-4">
      <nav className="flex flex-wrap gap-2">{(basePath === "/admin/inventory" ? [["stock","Stock"],["ledger","Movement ledger"],["warehouses","Warehouse / location"],["transfers","Stock transfer"],["counts","Stock count"],["assembly","Assembly"],["reports","Inventory reports"],["deliveries","Deliveries"]] : [["purchases","Purchases"],["receipts","Goods receipt"]]).filter(([href])=>allowedTabs.includes(href)).map(([href,label])=><Link key={href} href={`${basePath}/${href}`} className={`rounded-brand border px-3 py-2 text-sm font-semibold ${href===tab?"border-primary bg-primary text-white":"border-border bg-surface hover:bg-surface-muted"}`}>{label}</Link>)}</nav>
      {["receipts", "deliveries", "stock", "ledger", "warehouses"].includes(tab) && <InventoryGuide feature={tab} />}
      <ListFilters section={tab} filters={initialResult.filters} warehouses={data.warehouses} products={data.products} basePath={basePath} />
      {tab === "purchases" && <div className="space-y-3"><SectionTitle title="Purchase Orders" onAdd={openPurchaseDialog} />{data.purchaseOrders.length ? <Table heads={["PO", "Supplier", "Status", "Units", "Total", "Paid", "Due", "Expected", "Status action", "PO PDF", "Actions"]}>{data.purchaseOrders.map((po) => { const locked = po._count.receipts > 0 || po._count.supplierPayments > 0 || po._count.expenses > 0; const capabilities = { canEdit: !locked, canDelete: !locked, reason: locked ? "Receipt, payment, or linked expense exists" : "" }; return <tr key={po.id}><Cell><DetailLink section={tab} basePath={basePath} id={po.id}>{po.poNo}</DetailLink></Cell><Cell>{po.supplier.companyName}</Cell><Cell><Badge>{po.status.replaceAll("_", " ")}</Badge></Cell><Cell>{po.items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString("en-BD")}</Cell><Cell>{money(po.total)}</Cell><Cell>{money(po.paidAmount)}</Cell><Cell>{money(po.dueAmount)}</Cell><Cell>{day(po.expectedDate)}</Cell><Cell><select disabled={pending || locked} value={po.status} onChange={(e) => updateStatus(po.id, e.target.value)} className={`${fieldClass} min-w-32 text-sm`}><option>DRAFT</option><option>APPROVED</option><option>ORDERED</option><option>CANCELLED</option>{locked && <option>{po.status}</option>}</select></Cell><Cell><PurchaseOrderPDF purchaseOrder={po} /></Cell><Cell><RecordActions compact section={tab} basePath={basePath} id={po.id} capabilities={capabilities} /></Cell></tr>; })}</Table> : <Empty>No purchase orders yet.</Empty>}</div>}

      {tab === "receipts" && <div className="space-y-3"><SectionTitle title="Goods Receipts" onAdd={() => setDialog("receipt")} />{data.receipts.length ? <Table heads={["GRN", "Purchase Order", "Warehouse", "Status", "Batch / Supplier lot", "Qty", "Date", "Actions"]}>{data.receipts.map((receipt) => { const locked = receipt.purchaseOrder._count.supplierPayments > 0 || receipt.items.some((item) => item._count.deliveryItems > 0 || item.deliveredQuantity > 0); const capabilities = { canEdit: !locked && receipt.status !== "CANCELLED", canDelete: false, reason: locked ? "Cancel linked payment or delivery first" : "Use Cancel to reverse the stock movement" }; return <tr key={receipt.id}><Cell><DetailLink section={tab} basePath={basePath} id={receipt.id}>{receipt.grnNo}</DetailLink></Cell><Cell>{receipt.purchaseOrder.poNo}</Cell><Cell>{receipt.warehouse.name}</Cell><Cell><Badge>{receipt.status}</Badge></Cell><Cell><div className="space-y-1">{receipt.items.map((item) => <div key={item.id} className="whitespace-nowrap"><strong>{item.batchNumber || "Legacy item"}</strong><span className="text-text-muted"> · {item.supplierLotNumber || "lot not recorded"}</span></div>)}</div></Cell><Cell>{receipt.items.reduce((sum, item) => sum + item.quantity, 0)}</Cell><Cell>{day(receipt.createdAt)}</Cell><Cell><div className="flex gap-2"><RecordActions compact section={tab} basePath={basePath} id={receipt.id} capabilities={capabilities} />{receipt.status !== "CANCELLED" && !locked && <DocumentCancelButton action={cancelGoodsReceipt} id={receipt.id} label="Cancel receipt" />}</div></Cell></tr>; })}</Table> : <Empty>No goods receipts yet.</Empty>}</div>}

      {tab === "stock" && <div className="space-y-5"><SectionTitle title="Warehouse Stock" onAdd={() => setDialog("adjustment")} addLabel="Adjust stock" />{data.stocks.length ? <Table heads={["Product", "SKU", "Warehouse", "Quantity", "Reserved", "Available", "Avg. unit cost", "Stock value", "Updated"]}>{data.stocks.map((stock) => <tr key={stock.id}><Cell><DetailLink section={tab} basePath={basePath} id={stock.id}>{stock.variation.product?.title}</DetailLink></Cell><Cell>{stock.variation.sku}</Cell><Cell>{stock.warehouse.name}</Cell><Cell>{stock.quantity}</Cell><Cell>{stock.reserved}</Cell><Cell><strong>{stock.available}</strong></Cell><Cell>{money(stock.averageUnitCost)}</Cell><Cell>{money(stock.quantity * stock.averageUnitCost)}</Cell><Cell>{day(stock.updatedAt)}</Cell></tr>)}</Table> : <Empty>No warehouse stock has been posted.</Empty>}</div>}

      {tab === "ledger" && <div className="space-y-3"><SectionTitle title="Inventory Ledger" />{data.transactions?.length ? <Table heads={["Date", "Product", "SKU", "Warehouse", "Type", "Change", "Balance", "Unit cost", "Movement value", "Reference", "Remarks"]}>{data.transactions.map((entry) => <tr key={entry.id}><Cell>{day(entry.createdAt)}</Cell><Cell><DetailLink section={tab} basePath={basePath} id={entry.id}>{entry.variation.product?.title}</DetailLink></Cell><Cell>{entry.variation.sku}</Cell><Cell>{entry.warehouse.name}</Cell><Cell><Badge>{entry.type}</Badge></Cell><Cell>{entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}</Cell><Cell>{entry.balanceAfter}</Cell><Cell>{money(entry.unitCost)}</Cell><Cell>{money(Math.abs(entry.quantity) * (entry.unitCost || 0))}</Cell><Cell>{entry.referenceType}</Cell><Cell>{entry.remarks || "—"}</Cell></tr>)}</Table> : <Empty>No inventory transactions yet.</Empty>}</div>}

      {tab === "warehouses" && <div className="space-y-3"><SectionTitle title="Warehouses, shops and locations" onAdd={() => setDialog("warehouse")} />{data.warehouses.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.warehouses.map((warehouse) => <article key={warehouse.id} className="card"><div className="flex items-start justify-between"><div><h3 className="font-bold"><DetailLink section={tab} basePath={basePath} id={warehouse.id}>{warehouse.name}</DetailLink></h3><p className="text-sm text-text-muted">{warehouse.code} · {warehouse.type || "WAREHOUSE"}</p></div>{warehouse.isDefault && <Badge>DEFAULT</Badge>}</div><p className="mt-3 text-sm">{warehouse.address || "No address"}</p><p className="text-sm text-text-muted">{warehouse.manager || "No manager"} {warehouse.phone ? `· ${warehouse.phone}` : ""}</p></article>)}</div> : <Empty>No warehouses yet.</Empty>}</div>}



      {tab === "deliveries" && <div className="space-y-4">
        <nav className="flex gap-2 rounded-brand border border-border bg-surface p-2"><Link href="/admin/inventory/deliveries?view=queue" className={`rounded-brand px-4 py-2 text-sm font-semibold ${deliveryView === "queue" ? "bg-primary text-white" : "hover:bg-surface-muted"}`}>Delivery Queue</Link><Link href="/admin/inventory/deliveries?view=prepared" className={`rounded-brand px-4 py-2 text-sm font-semibold ${deliveryView === "prepared" ? "bg-primary text-white" : "hover:bg-surface-muted"}`}>Prepared Deliveries</Link></nav>
        {deliveryView === "queue" && <div className="space-y-3"><SectionTitle title="Delivery Queue" />{data.orders.length ? <Table heads={["Order", "Customer", "Courier / AWB", "Items", "Status", "Documents", "Action"]}>{data.orders.map((order) => <tr key={order.id}><Cell><Link className="font-semibold text-primary hover:underline" href={`/admin/order/view/${order.id}`}>{order.orderNo}</Link><small className="block text-text-muted">{day(order.createdAt)}</small></Cell><Cell>{order.customerName}<small className="block text-text-muted">{order.phoneNumber}</small></Cell><Cell>{order.shipping?.courierName || order.selectedCourierProvider?.name || "—"}<small className="block font-mono text-text-muted">{order.shipping?.cn || "No AWB"}</small></Cell><Cell>{order.orderItems.reduce((sum, item) => sum + item.quantity, 0)}</Cell><Cell><Badge>{order.status.replaceAll("_", " ")}</Badge></Cell><Cell><DeliveryPrintActions order={order} /></Cell><Cell>{!order.shipping ? <Link className={buttonClass} href={`/admin/order/view/${order.id}#courier`}>Book courier</Link> : order.status === "PROCESSING" ? <button type="button" className={buttonClass} onClick={() => prepareDelivery(order)}>Prepare delivery</button> : <span className="text-sm font-semibold text-emerald-600">Ready for delivery</span>}</Cell></tr>)}</Table> : <Empty>No courier orders are waiting in the delivery queue.</Empty>}</div>}
        {deliveryView === "prepared" && <div className="space-y-3"><SectionTitle title="Prepared Deliveries" onAdd={() => setDialog("delivery")} />{data.deliveries.length ? <Table heads={["Delivery", "Order", "Customer", "Warehouse", "Status", "Batch / Supplier lot", "Documents", "Date / cancel"]}>{data.deliveries.map((delivery) => <tr key={delivery.id}><Cell><DetailLink section={tab} basePath={basePath} id={delivery.id}>{delivery.deliveryNo}</DetailLink></Cell><Cell>{delivery.order.orderNo}</Cell><Cell>{delivery.order.customerName}</Cell><Cell>{delivery.warehouse.name}</Cell><Cell><Badge>{delivery.status}</Badge></Cell><Cell>{delivery.items.map((item) => <div key={item.id} className="whitespace-nowrap">{item.orderItem.sku}: <strong>{item.goodsReceiptItem.batchNumber}</strong> · {item.goodsReceiptItem.supplierLotNumber} × {item.quantity}</div>)}</Cell><Cell><DeliveryPrintActions order={delivery.order} /></Cell><Cell>{day(delivery.createdAt)}{delivery.status === "PACKED" && <div className="mt-1"><DocumentCancelButton action={cancelPreparedDelivery} id={delivery.id} label="Cancel delivery" /></div>}</Cell></tr>)}</Table> : <Empty>No deliveries have been prepared yet.</Empty>}</div>}
      </div>}

      <Pagination pagination={initialResult.pagination} section={tab} filters={initialResult.filters} basePath={basePath} />

      <FormDialog title="Add warehouse / shop / location" open={dialog === "warehouse"} onClose={close} action={createWarehouse}><div className="grid gap-4 sm:grid-cols-2"><Label>Code<input required name="code" className={fieldClass} /></Label><Label>Name<input required name="name" className={fieldClass} /></Label><Label>Location type<select name="type" className={fieldClass}><option value="WAREHOUSE">Warehouse</option><option value="SHOP">Shop</option><option value="LOCATION">Other location</option></select></Label><Label>Manager<input name="manager" className={fieldClass} /></Label><Label>Phone<input name="phone" className={fieldClass} /></Label><Label>Address<textarea name="address" className={fieldClass} /></Label><label className="flex items-center gap-2 pt-7 text-sm font-semibold"><input type="checkbox" name="isDefault" /> Default warehouse</label></div></FormDialog>

      <FormDialog title="Create purchase order" open={dialog === "purchase"} onClose={close} action={createPurchaseOrder} headerAction={<InventoryGuide feature="purchaseOrder" />} transform={(form) => form.set("items", JSON.stringify(poItems.map(({ rowKey, ...item }) => { const variation = poVariations.find((v) => v.id === item.variationId); return { ...item, productId: variation?.productId }; })))}>
        <div className="grid gap-4 sm:grid-cols-3">
          <SearchableDropdown name="supplierId" label="Supplier" placeholder="নাম লিখে খুঁজুন" dropDownLists={data.suppliers.map((supplier) => ({ id: supplier.id, name: supplier.companyName }))} required />
          <SearchableDropdown name="status" label="Status" defaultId={{ id: "DRAFT", name: "DRAFT" }} dropDownLists={["DRAFT", "APPROVED", "ORDERED"].map((status) => ({ id: status, name: status }))} />
          <FloatingInput label="Expected date" inputType="date" name="expectedDate" />
          <FloatingInput {...purchaseNumberProps} label="Order discount" inputType="number" min="0" step="0.01" name="discount" />
          <FloatingInput {...purchaseNumberProps} label="VAT amount" inputType="number" min="0" step="0.01" name="vat" />
          <FloatingInput {...purchaseNumberProps} label="Supplier delivery charge" inputType="number" min="0" step="0.01" name="shippingCost" />
          <p className="text-xs text-text-muted sm:col-span-3">The PO delivery charge is included in the supplier payable and the products’ unit cost.</p>
        </div>
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between"><h3 className="font-bold">Items</h3><button type="button" onClick={addItem} className="flex items-center gap-1 text-sm font-semibold text-primary"><Plus className="h-4 w-4" /> Add item</button></div>
          {poVariationLoading&&<p className="text-sm text-text-muted">Loading product options…</p>}
          {poItems.map((item, index) => <div key={item.rowKey} className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-2 rounded-brand border border-border p-3 sm:grid-cols-12">
            <div className="col-span-2 sm:col-span-5"><SearchableDropdown key={item.rowKey} name={`variation-${index}`} label="Product / variation" placeholder="Product name / SKU খুঁজুন" dropDownLists={purchaseVariationOptions.map((variation) => ({ id: variation.id, name: variation.label }))} onSelect={(variation) => setItem(index, "variationId", variation.id)} required /></div>
            <div className="sm:col-span-2"><FloatingInput {...purchaseNumberProps} label="Qty" required inputType="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => setItem(index, "quantity", e.target.value)} /></div>
            <div className="sm:col-span-2"><FloatingInput {...purchaseNumberProps} label="Unit cost" required inputType="number" min="0" step="0.01" value={item.unitCost} onChange={(e) => setItem(index, "unitCost", e.target.value)} /></div>
            <div className="sm:col-span-2"><FloatingInput {...purchaseNumberProps} label="Discount" inputType="number" min="0" step="0.01" value={item.discount} onChange={(e) => setItem(index, "discount", e.target.value)} /></div>
            <button type="button" onClick={() => removeItem(index)} aria-label={`Remove item ${index + 1}`} title="Remove item" className="inline-flex h-11 w-11 items-center justify-center rounded-brand border border-danger/40 text-danger hover:bg-danger/5 sm:col-span-1"><Trash2 className="h-4 w-4" /></button>
          </div>)}
        </div>
        <FloatingInput label="Notes" name="notes" multiline rows={3} />
      </FormDialog>

      <FormDialog title="Post goods receipt" open={dialog === "receipt"} onClose={close} action={createGoodsReceipt} onSuccess={(result) => { setBarcodeReceipt(result.data); setBarcodeLabelCounts(Object.fromEntries((result.data.items || []).map((item) => [item.id, Number(item.quantity) || 0]))); }} transform={(form) => form.set("items", JSON.stringify((selectedPo?.items || []).map((item) => ({ purchaseItemId: item.id, variationId: item.variationId, quantity: receiptQty[item.id] || 0, supplierLotNumber: receiptLots[item.id] || "" }))))}><div className="grid gap-4 sm:grid-cols-2"><Label>Purchase order<select required name="purchaseOrderId" value={receiptPoId} onChange={(e) => { setReceiptPoId(e.target.value); setReceiptQty({}); setReceiptLots({}); }} className={fieldClass}><option value="">Select purchase order</option>{openPurchases.map((po) => <option key={po.id} value={po.id}>{po.poNo} — {po.supplier.companyName}</option>)}</select></Label><Label>Warehouse<select required name="warehouseId" className={fieldClass}><option value="">Select warehouse</option>{data.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></Label></div>{selectedPo && <div className="mt-5 space-y-2"><h3 className="font-bold">Actual quantity received</h3><p className="text-sm text-text-muted">Enter the quantity that arrived. Total received quantity cannot exceed the PO ordered quantity. One barcode label will be prepared per received unit; labels encode the product SKU for POS scanning.</p>{selectedPo.items.map((item) => { const remaining = item.quantity - item.receivedQty; return <div key={item.id} className="grid gap-3 rounded-brand border border-border bg-surface-muted p-3 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(10rem,0.8fr)] sm:items-end"><span className="text-sm">{item.product.title} · {item.variation.sku}<small className="block text-text-muted">Ordered {item.quantity}, received before {item.receivedQty}, PO remainder {remaining}</small></span><Label>Quantity<input aria-label={`Received quantity for ${item.variation.sku}`} type="number" min="0" max={remaining} step="1" value={receiptQty[item.id] || ""} onChange={(e) => setReceiptQty((qty) => ({ ...qty, [item.id]: e.target.value }))} className={fieldClass} /></Label><Label>Supplier lot number<input aria-label={`Supplier lot number for ${item.variation.sku}`} required={Number(receiptQty[item.id]) > 0} value={receiptLots[item.id] || ""} onChange={(e) => setReceiptLots((lots) => ({ ...lots, [item.id]: e.target.value }))} className={fieldClass} placeholder="Enter supplier lot" /></Label></div>; })}</div>}</FormDialog>

      <Modal isOpen={Boolean(barcodeReceipt)} onClose={() => setBarcodeReceipt(null)}>
        {barcodeReceipt && <div className="mx-auto max-w-xl space-y-4"><div><h2 className="text-xl font-bold">Goods received</h2><p className="text-sm text-text-muted">{barcodeReceipt.grnNo} · {barcodeReceipt.items.reduce((sum, item) => sum + Math.max(0, Math.floor(Number(barcodeLabelCounts[item.id] ?? item.quantity) || 0)), 0)} barcode labels to print</p></div><p className="text-sm text-text-muted">Set the number of labels for each product. You can print more or fewer than the quantity received.</p><div className="max-h-72 space-y-2 overflow-auto rounded-xl bg-surface-muted p-3">{barcodeReceipt.items.map((item) => <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-3 text-sm"><span className="min-w-0">{item.variation?.product?.title || "Product"}<small className="block text-text-muted">{item.variation?.sku} · received {item.quantity}</small></span><Label>Print labels<input aria-label={`Barcode label count for ${item.variation?.sku}`} type="number" min="0" step="1" value={barcodeLabelCounts[item.id] ?? item.quantity} onChange={(event) => setBarcodeLabelCounts((counts) => ({ ...counts, [item.id]: event.target.value }))} className={fieldClass} /></Label></div>)}</div><button type="button" onClick={() => { if (printGoodsReceiptBarcodes(barcodeReceipt, barcodeLabelCounts)) setBarcodeReceipt(null); else toast.error("Allow pop-ups to print barcode labels."); }} className="button w-full justify-center"><Printer className="h-4 w-4" /> Print barcode labels</button></div>}
      </Modal>


      <FormDialog title="Adjust warehouse stock" open={dialog === "adjustment"} onClose={close} action={adjustStock}><div className="grid gap-4 sm:grid-cols-2"><Label>Warehouse<select required name="warehouseId" className={fieldClass}><option value="">Select warehouse</option>{data.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></Label><Label>Product variation<select required name="variationId" className={fieldClass}><option value="">Select variation</option>{variationOptions.map((variation) => <option key={variation.id} value={variation.id}>{variation.label}</option>)}</select></Label><Label>Quantity change<input required type="number" step="0.01" name="quantity" className={fieldClass} placeholder="Use a negative number to reduce" /></Label><Label>Unit cost for added stock<input type="number" min="0" step="0.01" name="unitCost" className={fieldClass} placeholder="Required for opening stock" /><small className="font-normal text-text-muted">Positive adjustment-এর ক্ষেত্রে existing cost থাকলে সেটিই চলবে; opening stock হলে unit cost দিন।</small></Label><Label>Reason<input required name="remarks" className={fieldClass} /></Label></div></FormDialog>
      <FormDialog title="Prepare order for delivery" open={dialog === "delivery"} onClose={close} action={createDelivery} transform={(form) => form.set("items", JSON.stringify(Object.entries(deliveryItems).map(([orderItemId, item]) => ({ orderItemId, goodsReceiptItemId: item.batchId, quantity: item.quantity }))))}><div className="grid gap-4 sm:grid-cols-2"><div><SearchableDropdown key={deliveryOrderId || "delivery-order"} name="orderId" label="Order" defaultId={selectedDeliveryOrder ? { id: selectedDeliveryOrder.id, name: `${selectedDeliveryOrder.orderNo} — ${selectedDeliveryOrder.customerName}` } : null} dropDownLists={(data.orders || []).map((order) => ({ id: order.id, name: `${order.orderNo} — ${order.customerName}` }))} onSelect={(item) => { setDeliveryOrderId(item.id); setDeliveryItems({}); }} /></div><div><SearchableDropdown name="warehouseId" label="Warehouse" dropDownLists={(data.warehouses || []).map((warehouse) => ({ id: warehouse.id, name: `${warehouse.name} (${warehouse.code})` }))} onSelect={(item) => { setDeliveryWarehouseId(item.id); setDeliveryItems({}); }} /></div><input type="hidden" name="status" value="PACKED" /><Label>Note<textarea name="note" className={fieldClass} /></Label></div>{selectedDeliveryOrder && deliveryWarehouseId && <div className="mt-5 space-y-3"><h3 className="font-bold">Allocate order items by batch / supplier lot</h3>{selectedDeliveryOrder.orderItems.map((orderItem) => { const availableBatches = (data.batches || []).filter((batch) => batch.variationId === orderItem.variationId && batch.goodsReceipt?.warehouseId === deliveryWarehouseId && batch.deliveredQuantity < batch.quantity); const current = deliveryItems[orderItem.id] || {}; return <div key={orderItem.id} className="grid gap-3 rounded-brand border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,1fr)_7rem] sm:items-end"><div className="text-sm font-semibold">{orderItem.productName}<small className="block font-normal text-text-muted">{orderItem.sku} · ordered {orderItem.quantity}</small></div><SearchableDropdown name={`batch-${orderItem.id}`} label="Batch / supplier lot" dropDownLists={availableBatches.map((batch) => ({ id: batch.id, name: `${batch.batchNumber} — ${batch.supplierLotNumber} (${batch.quantity - batch.deliveredQuantity} available)` }))} onSelect={(batch) => setDeliveryItems((items) => ({ ...items, [orderItem.id]: { ...items[orderItem.id], batchId: batch.id } }))} /><Label>Quantity<input type="number" min="0" step="0.01" value={current.quantity || ""} onChange={(event) => setDeliveryItems((items) => ({ ...items, [orderItem.id]: { ...items[orderItem.id], quantity: event.target.value } }))} className={fieldClass} /></Label></div>; })}</div>}</FormDialog>
    </section>
  );
}

function SectionTitle({ title, onAdd, addLabel = "Add new", secondary }) { return <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">{title}</h2><div className="flex gap-2">{secondary && <button type="button" onClick={secondary} className="min-h-11 rounded-brand border border-border px-4 text-sm font-semibold hover:bg-surface-muted">Add category</button>}{onAdd && <button type="button" onClick={onAdd} className={buttonClass}><Plus className="h-4 w-4" />{addLabel}</button>}</div></div>; }
function DetailLink({ section, id, children, basePath = "/admin/procurement" }) { return <Link className="font-semibold text-primary hover:underline" href={`${basePath}/${section}/${id}`}>{children}</Link>; }
function Table({ heads, children }) { return <div className="responsive-table rounded-brand border border-border bg-surface"><table className="min-w-[760px] text-left text-sm"><thead className="bg-surface-muted text-text-muted"><tr>{heads.map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr></thead><tbody className="divide-y divide-border">{children}</tbody></table></div>; }
function Cell({ children }) { return <td className="px-4 py-3 align-middle">{children}</td>; }
function Badge({ children }) { return <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">{children}</span>; }
function ListFilters({ section, filters = {}, warehouses = [], products = [], basePath = "/admin/procurement" }) {
  const statuses = { purchases: ["DRAFT", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"], receipts: ["PENDING", "COMPLETED"], deliveries: ["PACKED", "SHIPPED", "DELIVERED", "CANCELLED"], ledger: ["IN", "OUT", "RETURN_IN", "RETURN_OUT", "TRANSFER_IN", "TRANSFER_OUT", "ADJUSTMENT"] }[section] || [];
  const warehouse = warehouses.find((item) => item.id === filters.warehouseId);
  if (section === "deliveries") {
    const view = filters.view === "prepared" ? "prepared" : "queue";
    return <form method="get" action={`${basePath}/deliveries`} className="grid gap-2 rounded-brand border border-border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-5"><input type="hidden" name="view" value={view} /><input name="search" defaultValue={filters.search || ""} className={fieldClass} placeholder={view === "queue" ? "Order, customer or phone" : "Delivery, order or batch"} /><input aria-label="Start date" name="startDate" type="date" defaultValue={filters.startDate || ""} className={fieldClass} /><input aria-label="End date" name="endDate" type="date" defaultValue={filters.endDate || ""} className={fieldClass} />{view === "prepared" ? <select aria-label="Status" name="status" defaultValue={filters.status || "ALL"} className={fieldClass}><option>ALL</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select> : <span />}<button className={buttonClass} type="submit">Filter</button></form>;
  }
  return <form method="get" action={`${basePath}/${section}`} className="grid gap-2 rounded-brand border border-border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-5"><input name="search" defaultValue={filters.search || ""} className={fieldClass} placeholder="Search this list..." />{section === "purchases" && <select aria-label="Filter purchases by product" name="productId" defaultValue={filters.productId || ""} className={fieldClass}><option value="">All products</option>{products.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}</select>}<input aria-label="Start date" name="startDate" type="date" defaultValue={filters.startDate || ""} className={fieldClass} /><input aria-label="End date" name="endDate" type="date" defaultValue={filters.endDate || ""} className={fieldClass} />{["stock", "ledger"].includes(section) ? <SearchableDropdown name="warehouseId" defaultId={warehouse ? { id: warehouse.id, name: warehouse.name } : null} dropDownLists={warehouses.map((item) => ({ id: item.id, name: item.name }))} /> : statuses.length ? <select aria-label="Status" name="status" defaultValue={filters.status || "ALL"} className={fieldClass}><option>ALL</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select> : <span />}{section === "ledger" && <select aria-label="Transaction type" name="status" defaultValue={filters.status || "ALL"} className={fieldClass}><option>ALL</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>}<button className={buttonClass} type="submit">Filter</button></form>;
}
function Pagination({ pagination, section, filters = {}, basePath = "/admin/procurement" }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, limit, total, totalPages } = pagination;
  const href = (nextPage) => { const query = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => value && !["page", "limit"].includes(key) && query.set(key, value)); query.set("page", nextPage); query.set("limit", limit); return `${basePath}/${section}?${query}`; };
  return <div className="flex flex-col gap-3 rounded-brand border border-border bg-surface px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="text-text-muted">Page {page} of {totalPages} · {total} items</span><div className="flex gap-2"><Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))} className={`min-h-10 rounded-brand border border-border px-4 py-2 font-semibold ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-surface-muted"}`}>Previous</Link><Link aria-disabled={page >= totalPages} href={href(Math.min(totalPages, page + 1))} className={`min-h-10 rounded-brand border border-border px-4 py-2 font-semibold ${page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-surface-muted"}`}>Next</Link></div></div>;
}
