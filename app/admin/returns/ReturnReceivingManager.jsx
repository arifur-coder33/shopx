"use client";

import { receiveReturnedOrder, searchOrderForReturnReceiving } from "@/backend/serverActions/returnReceivingAction";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

const field = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text";

export default function ReturnReceivingManager({ data }) {
  const router = useRouter();
  const [orders, setOrders] = useState(data.orders || []);
  const [orderId, setOrderId] = useState(data.orders[0]?.id || "");
  const [orderNoQuery, setOrderNoQuery] = useState("");
  const [warehouseId, setWarehouseId] = useState(data.warehouses[0]?.id || "");
  const [reasonType, setReasonType] = useState("DELIVERY_FAIL");
  const [description, setDescription] = useState("");
  const [customerPaidCharge, setCustomerPaidCharge] = useState(false);
  const [selected, setSelected] = useState({});
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [searching, startSearch] = useTransition();
  const order = orders.find((item) => item.id === orderId);
  const needsExpense = reasonType === "DELIVERY_FAIL" && Number(order?.paidAmount || 0) <= 0 && !customerPaidCharge && Number(order?.deliveryCharge || 0) > Number(order?.deliveryDiscount || 0);
  const selectedItems = useMemo(() => Object.entries(selected).filter(([, row]) => Number(row.quantity) > 0).map(([orderItemId, row]) => ({ orderItemId, quantity: Number(row.quantity), disposition: row.disposition })), [selected]);

  const submit = (event) => {
    event.preventDefault();
    setMessage("");
    const formData = new FormData(event.currentTarget);
    formData.set("orderId", orderId);
    formData.set("warehouseId", warehouseId);
    formData.set("reasonType", reasonType);
    formData.set("description", description);
    formData.set("customerPaidCharge", String(customerPaidCharge));
    formData.set("items", JSON.stringify(selectedItems));
    startTransition(async () => {
      const result = await receiveReturnedOrder(formData);
      setMessage(result.message || "");
      if (result.success) { setSelected({}); setDescription(""); router.refresh(); }
    });
  };

  const searchOrder = (event) => {
    event.preventDefault();
    setMessage("");
    startSearch(async () => {
      const result = await searchOrderForReturnReceiving(orderNoQuery);
      if (!result.success) {
        setMessage(result.message || "Could not find an eligible order.");
        return;
      }
      const found = result.data;
      setOrders((current) => current.some((item) => item.id === found.id) ? current : [found, ...current]);
      setOrderId(found.id);
      setReasonType(["RETURNING", "FAILED_RETURNING", "DELIVERY_FAILED"].includes(found.status) ? "DELIVERY_FAIL" : "CUSTOMER_RETURN");
      setSelected({});
      setMessage(`Order #${found.orderNo} loaded. Select returned items and enter the inspection details.`);
    });
  };

  const canDeliveryFail = ["RETURNING", "FAILED_RETURNING", "DELIVERY_FAILED"].includes(order?.status);

  return <main className="mx-auto max-w-6xl space-y-5 pb-10">
    <header className="card"><h1 className="text-2xl font-black">Return receiving</h1><p className="mt-1 text-sm text-text-muted">Inspect returned items, then restock sellable products or dispose of damaged items.</p></header>
    <section className="card">
      <form onSubmit={searchOrder} className="flex flex-col gap-3 sm:flex-row">
        <label className="grid flex-1 gap-1.5 text-sm font-semibold">Find order by order number<input className={field} value={orderNoQuery} onChange={(event) => setOrderNoQuery(event.target.value)} placeholder="Enter order number" /></label>
        <button type="submit" disabled={searching || !orderNoQuery.trim()} className="button self-end disabled:opacity-50">{searching ? "Searching…" : "Search order"}</button>
      </form>
      <p className="mt-2 text-xs text-text-muted">Orders already marked for return or failed delivery appear in the list below. You can also search an order number to start a customer return for delivered items.</p>
    </section>
    {message && <p role="status" className="card text-sm">{message}</p>}
    {!orders.length ? <section className="card py-8 text-center text-text-muted">No return-request orders are currently waiting. Search by order number to receive a customer return.</section> : null}
    {orders.length || order ? <form onSubmit={submit} className="space-y-5">
      <section className="card grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold">Order<select className={field} value={orderId} required onChange={(event) => { setOrderId(event.target.value); setSelected({}); }}>{orders.map((item) => <option key={item.id} value={item.id}>#{item.orderNo} · {item.customerName} · {item.status}{["RETURNING", "FAILED_RETURNING", "DELIVERY_FAILED"].includes(item.status) ? " · Return requested" : ""}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-semibold">Receive into warehouse<select className={field} value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>{data.warehouses.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-semibold">Return reason type<select className={field} value={reasonType} onChange={(event) => setReasonType(event.target.value)}><option value="DELIVERY_FAIL" disabled={!canDeliveryFail}>Delivery fail</option><option value="CUSTOMER_RETURN">Customer return</option></select></label>
        <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Description / inspection note<textarea required maxLength={1000} rows={3} className={field} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Write why it was returned and item condition…" /></label>
      </section>
      <section className="card space-y-3"><h2 className="text-lg font-bold">Returned items</h2>{(order?.orderItems || []).map((item) => <div key={item.id} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem]"><div><strong>{item.productName}</strong><p className="text-xs text-text-muted">SKU {item.sku} · up to {item.receivedQuantity} returned</p></div><label className="grid gap-1 text-xs font-semibold">Received qty<input type="number" min="0" max={item.receivedQuantity} step="0.01" className={field} value={selected[item.id]?.quantity || ""} onChange={(event) => setSelected((current) => ({ ...current, [item.id]: { quantity: event.target.value, disposition: current[item.id]?.disposition || "RESTOCK" } }))} /></label><label className="grid gap-1 text-xs font-semibold">Inspection result<select className={field} value={selected[item.id]?.disposition || "RESTOCK"} onChange={(event) => setSelected((current) => ({ ...current, [item.id]: { quantity: current[item.id]?.quantity || "", disposition: event.target.value } }))}><option value="RESTOCK">Good · Restock</option><option value="DISPOSE">Damaged · Dispose</option></select></label></div>)}</section>
      {reasonType === "DELIVERY_FAIL" && Number(order?.paidAmount || 0) <= 0 && <section className="card space-y-3"><h2 className="font-bold">Delivery charge accounting</h2><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={customerPaidCharge} onChange={(event) => setCustomerPaidCharge(event.target.checked)} className="h-4 w-4 accent-primary" />Customer paid the return delivery charge</label>{needsExpense && <><p className="text-sm text-text-muted">No advance was recorded and the customer did not pay the charge. Record ৳{Math.max(0, Number(order.deliveryCharge) - Number(order.deliveryDiscount || 0))} under expense category “Delivery Fail”.</p><label className="grid max-w-md gap-1.5 text-sm font-semibold">Payment / source account<select required name="moneyAccountId" className={field}><option value="">Select account</option>{data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.type}</option>)}</select></label></>}</section>}
      <button type="submit" disabled={pending || !orderId || !warehouseId || !selectedItems.length} className="button disabled:opacity-50">{pending ? "Saving return…" : "Receive returned items"}</button>
    </form> : null}
  </main>;
}
