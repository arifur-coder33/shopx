"use client";

import { submitBanglaQrTransaction } from "@/backend/serverActions/orderActions";
import { Download } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

export default function BanglaQrPaymentPageClient({ order }) {
  const [transactionId, setTransactionId] = useState("");
  const [submitted, setSubmitted] = useState(order.qrPayment?.status === "PENDING" ? order.qrPayment?.transactionId || "" : "");
  const [pending, startTransition] = useTransition();
  const config = order.selectedPaymentGateway?.nonSecretConfig || {};
  const qrUrl = String(config.qrImageUrl || "");
  const amount = Number(order.dueAmount || order.qrPayment?.amount || 0);
  const canSubmit = order.status === "PENDING" && order.qrPayment && !submitted;
  const submit = (event) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await submitBanglaQrTransaction({ orderNo: order.orderNo, phoneNumber: order.phoneNumber, transactionId });
      if (!result.success) return toast.error(result.message);
      setSubmitted(transactionId.trim());
      setTransactionId("");
      toast.success(result.message);
    });
  };
  return <main className="mx-auto min-h-[70vh] w-full max-w-xl px-4 py-8 text-slate-900">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h1 className="text-xl font-bold">Bangla QR পেমেন্ট</h1>
      <p className="mt-1 text-sm text-slate-600">অর্ডার #{order.orderNo}</p>
      <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-lg font-bold text-emerald-800">পরিশোধযোগ্য: ৳{amount.toLocaleString("en-BD")}</p>
      {qrUrl && <div className="mx-auto mt-5 max-w-64 rounded-xl border border-slate-200 bg-white p-3">
        <img src={qrUrl} alt="Bangla QR payment code" className="aspect-square w-full object-contain" />
        <a href={`/api/payments/bangla-qr/download?o=${encodeURIComponent(order.orderNo)}&p=${encodeURIComponent(order.phoneNumber)}`} className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-3.5 w-3.5" /> QR ডাউনলোড</a>
      </div>}
      <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        <p className="font-semibold">পেমেন্ট করার নিয়ম</p>
        <ol className="mt-1 list-inside list-decimal space-y-1">
          <li>আপনার payment app খুলে Scan/QR অপশন বেছে নিন।</li>
          <li>উপরের QR scan করে দেখানো পরিমাণটি পরিশোধ করুন।</li>
          <li>পেমেন্ট সফল হলে confirmation message-এর TrxID নিচে জমা দিন।</li>
        </ol>
      </div>
      {submitted ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">TrxID <strong className="font-mono">{submitted}</strong> জমা হয়েছে। পেমেন্ট যাচাই চলছে।</p> : canSubmit ? <form onSubmit={submit} className="mt-4 space-y-2">
        <label htmlFor="bangla-qr-trxid" className="text-sm font-semibold">পেমেন্টের TrxID</label>
        <div className="flex gap-2"><input id="bangla-qr-trxid" required minLength={4} maxLength={100} value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="TrxID লিখুন" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5" /><button disabled={pending || transactionId.trim().length < 4} className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{pending ? "জমা হচ্ছে…" : "পেমেন্ট সম্পন্ন"}</button></div>
      </form> : <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">এই অর্ডারের Bangla QR পেমেন্ট এখন জমা নেওয়া যাচ্ছে না।</p>}
    </section>
  </main>;
}
