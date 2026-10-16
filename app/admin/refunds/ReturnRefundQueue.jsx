"use client";

import { completeQueuedReturnRefund, decideReturnRefund } from "@/backend/serverActions/refundAction";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const field = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text";
const money = (amount) => `৳${Number(amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReturnRefundQueue({ refunds, moneyAccounts, history }) {
  const router = useRouter();
  const [amounts, setAmounts] = useState({});
  const [notes, setNotes] = useState({});
  const [destinationTypes, setDestinationTypes] = useState({});
  const [destinationDetails, setDestinationDetails] = useState({});
  const [sourceAccounts, setSourceAccounts] = useState({});
  const [references, setReferences] = useState({});
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const runDecision = (refund, decision) => {
    if (decision === "DENY" && !window.confirm(`Deny the refund request for order #${refund.order.orderNo}? No money will be paid.`)) return;
    setMessage("");
    startTransition(async () => {
      const result = await decideReturnRefund(refund.id, decision, amounts[refund.id] ?? refund.amount, notes[refund.id] || "");
      setMessage(result.message || "");
      if (result.success) router.refresh();
    });
  };

  const complete = (refund) => {
    const destinationType = destinationTypes[refund.id] || refund.refundDestinationType || "ORIGINAL_PAYMENT";
    const destination = destinationDetails[refund.id] ?? (refund.refundDestinationType === "CUSTOMER_PROVIDED" ? refund.refundDestinationDetails || "" : "");
    if (destinationType === "CUSTOMER_PROVIDED" && !destination.trim()) {
      setMessage("Enter the customer-provided refund account or mobile wallet details.");
      return;
    }
    if (!window.confirm(`Confirm that ${money(refund.amount)} has been sent for order #${refund.order.orderNo}? The selected business account will be debited.`)) return;
    setMessage("");
    startTransition(async () => {
      const result = await completeQueuedReturnRefund(refund.id, {
        destinationType,
        destinationDetails: destination,
        sourceMoneyAccountId: sourceAccounts[refund.id] || refund.moneyAccount?.id || moneyAccounts[0]?.id || "",
        externalReference: references[refund.id] || "",
      });
      setMessage(result.message || "");
      if (result.success) router.refresh();
    });
  };

  return <main className="mx-auto max-w-6xl space-y-5 pb-10">
    <header className="card"><h1 className="text-2xl font-black">Refund queue</h1><p className="mt-1 text-sm text-text-muted">Delivered returns paid by COD or online, and delivery failures with an advance payment, appear here. Review the amount, approve or deny it, then choose the customer's payout destination and the business account to pay from.</p></header>
    {message && <p role="status" className="card text-sm">{message}</p>}
    {!refunds.length ? <section className="card py-12 text-center text-text-muted">No return refunds are waiting for a decision.</section> : <section className="space-y-4">{refunds.map((refund) => {
      const destinationType = destinationTypes[refund.id] || refund.refundDestinationType || "ORIGINAL_PAYMENT";
      const defaultSource = moneyAccounts.some((account) => account.id === refund.moneyAccount?.id) ? refund.moneyAccount.id : moneyAccounts[0]?.id || "";
      const sourceAccountId = sourceAccounts[refund.id] || defaultSource;
      return <article key={refund.id} className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-bold">Order #{refund.order.orderNo} · {refund.order.customerName}</h2><p className="text-sm text-text-muted">{refund.order.phoneNumber} · {refund.returnReceipt.reasonType === "DELIVERY_FAIL" ? "Delivery fail" : "Customer return"} · {new Date(refund.createdAt).toLocaleString()}</p></div>
          <div className="text-right"><strong className="text-xl text-primary">{money(refund.amount)}</strong><p className="text-xs font-semibold">{refund.status === "APPROVED" ? "Approved · awaiting payout" : "Needs admin decision"}</p></div>
        </div>
        <div className="rounded-xl bg-surface-muted p-3 text-sm"><strong>Returned products</strong><ul className="mt-1 list-inside list-disc">{refund.returnReceipt.items.map((item, index) => <li key={`${item.orderItem.sku}-${index}`}>{item.orderItem.productName} ({item.orderItem.sku}) · {item.quantity} · {item.disposition === "RESTOCK" ? "Restocked" : "Disposed"}</li>)}</ul>{refund.returnReceipt.description && <p className="mt-2 text-text-muted">{refund.returnReceipt.description}</p>}</div>
        <div className="grid gap-3 sm:grid-cols-2"><p className="text-sm"><span className="text-text-muted">Original payment:</span> {refund.payment?.gateway || refund.payment?.paymentMethod || "Payment"}{refund.payment?.transactionId ? ` · ${refund.payment.transactionId}` : ""}</p><p className="text-sm"><span className="text-text-muted">Original collection account:</span> {refund.moneyAccount ? `${refund.moneyAccount.name} (${refund.moneyAccount.type})` : "—"}</p></div>
        {refund.adminNote && <p className="whitespace-pre-line text-sm text-text-muted">Note: {refund.adminNote}</p>}
        {refund.status === "PENDING" ? <div className="space-y-3 border-t border-border pt-4">
          <label className="grid max-w-sm gap-1.5 text-sm font-semibold">Approve refund amount (up to {money(refund.amount)})<input type="number" min="0.01" max={refund.amount} step="0.01" className={field} value={amounts[refund.id] ?? refund.amount} onChange={(event) => setAmounts((current) => ({ ...current, [refund.id]: event.target.value }))} /></label>
          <input className={field} value={notes[refund.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [refund.id]: event.target.value }))} placeholder="Decision note (optional)" />
          <div className="flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => runDecision(refund, "APPROVE")} className="button disabled:opacity-50">Approve amount</button><button type="button" disabled={pending} onClick={() => runDecision(refund, "DENY")} className="rounded-xl border border-danger px-4 py-2 text-sm font-semibold text-danger disabled:opacity-50">Deny refund</button></div>
        </div> : <div className="space-y-3 border-t border-border pt-4">
          <label className="grid gap-1.5 text-sm font-semibold sm:max-w-md">Business account to debit<select className={field} value={sourceAccountId} onChange={(event) => setSourceAccounts((current) => ({ ...current, [refund.id]: event.target.value }))}><option value="">Select account</option>{moneyAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.type} · balance {money(account.balance)}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-semibold sm:max-w-md">Send refund to<select className={field} value={destinationType} onChange={(event) => setDestinationTypes((current) => ({ ...current, [refund.id]: event.target.value }))}><option value="ORIGINAL_PAYMENT">Original payment account / method</option><option value="CUSTOMER_PROVIDED">Account provided by customer</option></select></label>
          {destinationType === "CUSTOMER_PROVIDED" ? <label className="grid gap-1.5 text-sm font-semibold">Customer payout details<input required maxLength={500} className={field} value={destinationDetails[refund.id] ?? (refund.refundDestinationType === "CUSTOMER_PROVIDED" ? refund.refundDestinationDetails || "" : "")} onChange={(event) => setDestinationDetails((current) => ({ ...current, [refund.id]: event.target.value }))} placeholder="bKash/Nagad/bank name, account number and account holder" /></label> : <p className="text-sm text-text-muted">Original payment: {refund.payment?.gateway || refund.payment?.paymentMethod || "Unknown method"}{refund.payment?.transactionId ? ` · Ref ${refund.payment.transactionId}` : ""}</p>}
          <input className={field} value={references[refund.id] || ""} onChange={(event) => setReferences((current) => ({ ...current, [refund.id]: event.target.value }))} placeholder="Refund transaction/reference ID (optional)" />
          <button type="button" disabled={pending || !sourceAccountId || !moneyAccounts.length} onClick={() => complete(refund)} className="button disabled:opacity-50">{pending ? "Saving…" : `Mark ${money(refund.amount)} refund sent`}</button>
          {!moneyAccounts.length && <p className="text-xs text-danger">Add or activate a business money account before sending a refund.</p>}
        </div>}
      </article>;
    })}</section>}
    {history?.length > 0 && <section className="card space-y-3"><h2 className="text-lg font-bold">Recent refund decisions</h2><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-border text-text-muted"><th className="p-2">Order</th><th className="p-2">Decision</th><th className="p-2">Amount</th><th className="p-2">Business account debited</th><th className="p-2">Customer destination</th><th className="p-2">Reference</th></tr></thead><tbody>{history.map((item) => <tr key={item.id} className="border-b border-border"><td className="p-2">#{item.order.orderNo} · {item.order.customerName}</td><td className="p-2">{item.status === "COMPLETED" ? "Paid" : "Denied"}</td><td className="p-2">{money(item.amount)}</td><td className="p-2">{item.moneyAccount ? `${item.moneyAccount.name} (${item.moneyAccount.type})` : "—"}</td><td className="max-w-xs whitespace-pre-wrap p-2">{item.refundDestinationType === "CUSTOMER_PROVIDED" ? item.refundDestinationDetails : item.refundDestinationDetails || "Original payment method"}</td><td className="p-2">{item.externalReference || "—"}</td></tr>)}</tbody></table></div></section>}
  </main>;
}
