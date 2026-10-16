"use client";

import { decideReturnRefund } from "@/backend/serverActions/refundAction";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const field = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text";
const money = (amount) => `৳${Number(amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReturnRefundQueue({ refunds, history }) {
  const router = useRouter();
  const [amounts, setAmounts] = useState({});
  const [notes, setNotes] = useState({});
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const decide = (refund, decision) => {
    if (decision === "DENY" && !window.confirm(`Deny the refund request for order #${refund.order.orderNo}? No money will be paid.`)) return;
    setMessage("");
    startTransition(async () => {
      const result = await decideReturnRefund(refund.id, decision, amounts[refund.id] ?? refund.amount, notes[refund.id] || "");
      setMessage(result.message || "");
      if (result.success) router.refresh();
    });
  };

  return <main className="mx-auto max-w-6xl space-y-5 pb-10">
    <header className="card"><h1 className="text-2xl font-black">Refund approvals · MKT</h1><p className="mt-1 text-sm text-text-muted">Review the requested amount and approve or deny. Approved refunds move to Accounts for payout; this page does not disburse money.</p></header>
    {message && <p role="status" className="card text-sm">{message}</p>}
    {!refunds.length ? <section className="card py-12 text-center text-text-muted">No refunds are waiting for MKT approval.</section> : <section className="space-y-4">{refunds.map((refund) => <article key={refund.id} className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Order #{refund.order.orderNo} · {refund.order.customerName}</h2><p className="text-sm text-text-muted">{refund.order.phoneNumber} · {refund.returnReceipt.reasonType === "DELIVERY_FAIL" ? "Delivery fail · advance paid" : "Customer return"} · {new Date(refund.createdAt).toLocaleString()}</p></div><div className="text-right"><strong className="text-xl text-primary">{money(refund.amount)}</strong><p className="text-xs">Maximum suggested refund</p></div></div>
      <div className="rounded-xl bg-surface-muted p-3 text-sm"><strong>Returned products</strong><ul className="mt-1 list-inside list-disc">{refund.returnReceipt.items.map((item, index) => <li key={`${item.orderItem.sku}-${index}`}>{item.orderItem.productName} ({item.orderItem.sku}) · {item.quantity} · {item.disposition === "RESTOCK" ? "Restocked" : "Disposed"}</li>)}</ul>{refund.returnReceipt.description && <p className="mt-2 text-text-muted">{refund.returnReceipt.description}</p>}</div>
      <div className="grid gap-3 sm:grid-cols-2"><p className="text-sm"><span className="text-text-muted">Paid through:</span> {refund.payment?.gateway || refund.payment?.paymentMethod || "Payment"}{refund.payment?.transactionId ? ` · ${refund.payment.transactionId}` : ""}</p><p className="text-sm"><span className="text-text-muted">Payment collected into:</span> {refund.moneyAccount ? `${refund.moneyAccount.name} (${refund.moneyAccount.type})` : "—"}</p></div>
      {refund.adminNote && <p className="whitespace-pre-line text-sm text-text-muted">Return note: {refund.adminNote}</p>}
      <div className="space-y-3 border-t border-border pt-4"><label className="grid max-w-sm gap-1.5 text-sm font-semibold">Approve refund amount (up to {money(refund.amount)})<input type="number" min="0.01" max={refund.amount} step="0.01" className={field} value={amounts[refund.id] ?? refund.amount} onChange={(event) => setAmounts((current) => ({ ...current, [refund.id]: event.target.value }))} /></label><input className={field} value={notes[refund.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [refund.id]: event.target.value }))} placeholder="Approval or denial note (optional)" /><div className="flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => decide(refund, "APPROVE")} className="button disabled:opacity-50">Approve amount</button><button type="button" disabled={pending} onClick={() => decide(refund, "DENY")} className="rounded-xl border border-danger px-4 py-2 text-sm font-semibold text-danger disabled:opacity-50">Deny refund</button></div></div>
    </article>)}</section>}
    {history?.length > 0 && <section className="card space-y-3"><h2 className="text-lg font-bold">Recent refund decisions</h2><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-border text-text-muted"><th className="p-2">Order</th><th className="p-2">Status</th><th className="p-2">Amount</th><th className="p-2">Decision note</th></tr></thead><tbody>{history.map((item) => <tr key={item.id} className="border-b border-border"><td className="p-2">#{item.order.orderNo} · {item.order.customerName}</td><td className="p-2">{item.status === "APPROVED" ? "Approved · in Accounts" : item.status === "COMPLETED" ? "Paid" : "Denied"}</td><td className="p-2">{money(item.amount)}</td><td className="max-w-xs whitespace-pre-wrap p-2">{item.adminNote || "—"}</td></tr>)}</tbody></table></div></section>}
  </main>;
}
