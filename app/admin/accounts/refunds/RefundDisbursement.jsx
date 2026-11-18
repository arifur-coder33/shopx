"use client";

import { completeQueuedReturnRefund } from "@/backend/serverActions/refundAction";
import AccountGuide from "../AccountGuide";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const field = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text";
const money = (amount) => `৳${Number(amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RefundDisbursement({ refunds, moneyAccounts, history }) {
  const router = useRouter();
  const [destinationTypes, setDestinationTypes] = useState({});
  const [destinationDetails, setDestinationDetails] = useState({});
  const [sourceAccounts, setSourceAccounts] = useState({});
  const [references, setReferences] = useState({});
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const pay = (refund, sourceMoneyAccountId, destinationType, destination) => {
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
        sourceMoneyAccountId,
        externalReference: references[refund.id] || "",
      });
      setMessage(result.message || "");
      if (result.success) router.refresh();
    });
  };

  return <main className="mx-auto max-w-6xl space-y-5 pb-10">
    <header className="card"><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-black">Refund disbursement · Accounts</h1><AccountGuide feature="refunds"/></div><p className="mt-1 text-sm text-text-muted">MKT-approved refunds arrive here. Accounts verifies the payout destination, sends the money, and records the business account that is debited.</p></header>
    {message && <p role="status" className="card text-sm">{message}</p>}
    {!refunds.length ? <section className="card py-12 text-center text-text-muted">No approved refunds are waiting for payout.</section> : <section className="space-y-4">{refunds.map((refund) => {
      const destinationType = destinationTypes[refund.id] || refund.refundDestinationType || "ORIGINAL_PAYMENT";
      const defaultSource = moneyAccounts.some((account) => account.id === refund.moneyAccount?.id) ? refund.moneyAccount.id : moneyAccounts[0]?.id || "";
      const sourceAccountId = sourceAccounts[refund.id] || defaultSource;
      const destination = destinationDetails[refund.id] ?? (refund.refundDestinationType === "CUSTOMER_PROVIDED" ? refund.refundDestinationDetails || "" : "");
      return <article key={refund.id} className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Order #{refund.order.orderNo} · {refund.order.customerName}</h2><p className="text-sm text-text-muted">{refund.order.phoneNumber} · {refund.returnReceipt.reasonType === "DELIVERY_FAIL" ? "Delivery fail · advance paid" : "Customer return"}</p></div><div className="text-right"><strong className="text-xl text-primary">{money(refund.amount)}</strong><p className="text-xs font-semibold">Approved by MKT</p></div></div>
        <div className="rounded-xl bg-surface-muted p-3 text-sm"><strong>Returned products</strong><ul className="mt-1 list-inside list-disc">{refund.returnReceipt.items.map((item, index) => <li key={`${item.orderItem.sku}-${index}`}>{item.orderItem.productName} ({item.orderItem.sku}) · {item.quantity} · {item.disposition === "RESTOCK" ? "Restocked" : "Disposed"}</li>)}</ul></div>
        {refund.adminNote && <p className="whitespace-pre-line text-sm text-text-muted">Return / approval note: {refund.adminNote}</p>}
        <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold">Business account to debit<select className={field} value={sourceAccountId} onChange={(event) => setSourceAccounts((current) => ({ ...current, [refund.id]: event.target.value }))}><option value="">Select account</option>{moneyAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.type} · balance {money(account.balance)}</option>)}</select></label><label className="grid gap-1.5 text-sm font-semibold">Send refund to<select className={field} value={destinationType} onChange={(event) => setDestinationTypes((current) => ({ ...current, [refund.id]: event.target.value }))}><option value="ORIGINAL_PAYMENT">Original payment account / method</option><option value="CUSTOMER_PROVIDED">Account provided by customer</option></select></label></div>
        {destinationType === "CUSTOMER_PROVIDED" ? <label className="grid gap-1.5 text-sm font-semibold">Customer payout details<input required maxLength={500} className={field} value={destination} onChange={(event) => setDestinationDetails((current) => ({ ...current, [refund.id]: event.target.value }))} placeholder="bKash/Nagad/bank name, account number and account holder" /></label> : <p className="text-sm text-text-muted">Original payment: {refund.payment?.gateway || refund.payment?.paymentMethod || "Unknown method"}{refund.payment?.transactionId ? ` · Ref ${refund.payment.transactionId}` : ""}</p>}
        <input className={field} value={references[refund.id] || ""} onChange={(event) => setReferences((current) => ({ ...current, [refund.id]: event.target.value }))} placeholder="Refund transaction/reference ID (optional)" />
        <button type="button" disabled={pending || !sourceAccountId || !moneyAccounts.length} onClick={() => pay(refund, sourceAccountId, destinationType, destination)} className="button disabled:opacity-50">{pending ? "Recording payout…" : `Confirm sent · ${money(refund.amount)}`}</button>
        {!moneyAccounts.length && <p className="text-xs text-danger">Add or activate a business money account before disbursing a refund.</p>}
      </article>;
    })}</section>}
    {history?.length > 0 && <section className="card space-y-3"><h2 className="text-lg font-bold">Recent completed refunds</h2><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b border-border text-text-muted"><th className="p-2">Order</th><th className="p-2">Amount</th><th className="p-2">Debited account</th><th className="p-2">Customer destination</th><th className="p-2">Reference</th><th className="p-2">Paid at</th></tr></thead><tbody>{history.map((item) => <tr key={item.id} className="border-b border-border"><td className="p-2">#{item.order.orderNo} · {item.order.customerName}</td><td className="p-2">{money(item.amount)}</td><td className="p-2">{item.moneyAccount ? `${item.moneyAccount.name} (${item.moneyAccount.type})` : "—"}</td><td className="max-w-xs whitespace-pre-wrap p-2">{item.refundDestinationDetails || "Original payment method"}</td><td className="p-2">{item.externalReference || "—"}</td><td className="p-2">{item.refundedAt ? new Date(item.refundedAt).toLocaleString() : "—"}</td></tr>)}</tbody></table></div></section>}
  </main>;
}
