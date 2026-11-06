"use client";

import { retryCustomerOrderPayment } from "@/backend/serverActions/paymentInitiationAction";
import { cancelUnpaidCustomerOrder, submitBanglaQrTransaction, updateUnconfirmedCustomerOrderAddress } from "@/backend/serverActions/orderActions";
import { Ban, CreditCard, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";
import PaymentMethodSelector from "../checkout/PaymentMethodSelector";

const blockedPaymentStatuses = new Set([
  "PAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
]);

export default function OrderPaymentRecovery({ order, onChanged }) {
  const router = useRouter();
  const [localOrder, setLocalOrder] = useState(order);
  const [paymentSelection, setPaymentSelection] = useState(null);
  const [showMethods, setShowMethods] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showAddress, setShowAddress] = useState(false);
  const [banglaQrTransactionId, setBanglaQrTransactionId] = useState("");
  const [addressForm, setAddressForm] = useState({
    deliveryAddress: order?.deliveryAddress || "",
    city: order?.city || "",
    thana: order?.thana || "",
    deliveryArea: order?.deliveryArea === "inside-dhaka" ? "inside-dhaka" : "outside-dhaka",
  });
  const [pending, startTransition] = useTransition();

  const canManage = useMemo(() => localOrder?.status === "PENDING" && Number(localOrder?.dueAmount || 0) > 0 && !blockedPaymentStatuses.has(localOrder?.paymentStatus), [localOrder]);
  const canChangePayment = canManage && Number(localOrder?.paidAmount || 0) <= 0 && localOrder?.paymentMethod === "COD";
  const canPayNow = canManage && localOrder?.paymentMethod !== "COD" && ((Number(localOrder?.paidAmount || 0) <= 0 && localOrder?.paymentStatus === "FAILED") || (Number(localOrder?.paidAmount || 0) > 0 && localOrder?.paymentMethod === "ONLINE"));

  if (!localOrder) return null;

  const qrConfiguration = localOrder.selectedPaymentGateway?.adapterKey === "BANGLA_QR" ? localOrder.selectedPaymentGateway.nonSecretConfig : null;
  const qrPayment = localOrder.selectedPaymentGateway?.adapterKey === "BANGLA_QR" ? localOrder.payments?.find((payment) => payment.paymentGateway?.adapterKey === "BANGLA_QR" || payment.gateway === "BANGLA_QR") : null;

  const applyLocalChange = (changes) => {
    const next = { ...localOrder, ...changes };
    setLocalOrder(next);
    onChanged?.(next);
  };

  const startPayment = () => {
    if (!paymentSelection) {
      toast.error("একটি পেমেন্ট মেথড নির্বাচন করুন।");
      return;
    }
    startTransition(async () => {
      const result = await retryCustomerOrderPayment({
        orderNo: localOrder.orderNo,
        phoneNumber: localOrder.phoneNumber,
        ...paymentSelection,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      if (result.manualPayment) {
        applyLocalChange({
          paymentMethod: paymentSelection.paymentMethod,
          paymentStatus: "PENDING",
          selectedPaymentGateway: { adapterKey: "BANGLA_QR", nonSecretConfig: result.banglaQr },
          payments: [{ id: result.paymentId, gateway: "BANGLA_QR", amount: localOrder.dueAmount, status: "PENDING", transactionId: null, paymentGateway: { adapterKey: "BANGLA_QR", nonSecretConfig: result.banglaQr } }, ...(localOrder.payments || [])],
        });
        setShowMethods(false);
        setPaymentSelection(null);
        toast.success("Bangla QR পেমেন্টের তথ্য দেখানো হচ্ছে।");
        return;
      }
      applyLocalChange({ paymentMethod: paymentSelection.paymentMethod, paymentStatus: paymentSelection.paymentMethod === "COD" ? "UNPAID" : "PENDING" });
      setShowMethods(false);
      setPaymentSelection(null);
      toast.success(result.message);
      router.refresh();
    });
  };

  const cancelOrder = () => {
    startTransition(async () => {
      const result = await cancelUnpaidCustomerOrder({
        orderNo: localOrder.orderNo,
        phoneNumber: localOrder.phoneNumber,
        reason: cancelReason,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      applyLocalChange({ status: "CANCELLED", ...(Number(localOrder.paidAmount || 0) <= 0 && { paymentStatus: "CANCELLED" }) });
      setShowCancel(false);
      setShowMethods(false);
      toast.success(result.message);
      router.refresh();
    });
  };

  const updateAddress = () => startTransition(async () => {
    const result = await updateUnconfirmedCustomerOrderAddress({ orderNo: localOrder.orderNo, phoneNumber: localOrder.phoneNumber, ...addressForm });
    if (!result.success) return toast.error(result.message);
    applyLocalChange({ ...result.data, payments: result.data.banglaQrPaymentReset ? (localOrder.payments || []).map((payment) => payment.paymentGateway?.adapterKey === "BANGLA_QR" ? { ...payment, amount: result.data.dueAmount, transactionId: null } : payment) : localOrder.payments });
    setShowAddress(false);
    toast.success(result.message);
    router.refresh();
  });

  const submitQrTrxId = () => startTransition(async () => {
    const result = await submitBanglaQrTransaction({ orderNo: localOrder.orderNo, phoneNumber: localOrder.phoneNumber, transactionId: banglaQrTransactionId });
    if (!result.success) return toast.error(result.message);
    const payments = (localOrder.payments || []).map((payment, index) => index === 0 ? { ...payment, transactionId: banglaQrTransactionId.trim(), status: "PENDING" } : payment);
    applyLocalChange({ paymentStatus: "PENDING", payments });
    setBanglaQrTransactionId("");
    toast.success(result.message);
    router.refresh();
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900">পেমেন্ট</h3>
          <p className="text-sm text-slate-500">
            স্ট্যাটাস: <span className="font-semibold">{localOrder.paymentStatus}</span>
            {localOrder.paymentMethod && <> · {localOrder.paymentMethod}</>}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {canChangePayment && <button
              type="button"
              disabled={pending}
              onClick={() => {
                setShowMethods((value) => !value);
                setShowCancel(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" /> পেমেন্ট মেথড পরিবর্তন করুন
            </button>}
            {canPayNow && <button
              type="button"
              disabled={pending}
              onClick={() => { setShowMethods((value) => !value); setShowCancel(false); }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            ><CreditCard className="h-4 w-4" /> {Number(localOrder?.paidAmount || 0) > 0 ? "বাকি টাকা পরিশোধ করুন" : "Pay now"}</button>}
          </div>
        )}
        {localOrder.status === "PENDING" && <div className="flex gap-2"><button type="button" disabled={pending} onClick={() => { setShowCancel((value) => !value); setShowMethods(false); setShowAddress(false); }} className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"><Ban className="h-4 w-4" /> অর্ডার বাতিল করুন</button><button type="button" disabled={pending} onClick={() => { setShowAddress((value) => !value); setShowMethods(false); setShowCancel(false); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">ঠিকানা পরিবর্তন</button></div>}
      </div>

      {localOrder.status === "CANCELLED" && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          এই অর্ডারটি বাতিল করা হয়েছে। নতুন পেমেন্ট করা যাবে না।
        </p>
      )}

      {localOrder.status === "PENDING" && qrConfiguration?.qrImageUrl && qrPayment && (
        <div className="mt-4 grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-[180px_1fr]">
          <div className="rounded-lg bg-white p-2">{/^https:\/\//u.test(qrConfiguration.qrImageUrl) && <img src={qrConfiguration.qrImageUrl} alt="Merchant Bangla QR" className="mx-auto aspect-square w-full max-w-44 object-contain" />}</div>
          <div className="space-y-2"><h4 className="font-bold">Bangla QR দিয়ে পেমেন্ট</h4><p className="text-sm">৳{Number(qrPayment.amount || localOrder.dueAmount || 0).toLocaleString("en-BD")} · {qrConfiguration.bankName || "Merchant"} ({qrConfiguration.bankType === "MFS" ? "MFS" : "Bank"}) {qrConfiguration.merchantNumber ? `· ${qrConfiguration.merchantNumber}` : ""}</p><p className="text-sm text-text-muted">{qrConfiguration.instructions}</p>
            {qrPayment.transactionId && qrPayment.status === "PENDING" ? <p className="rounded-lg bg-white p-3 text-sm">TrxID <strong className="font-mono">{qrPayment.transactionId}</strong> জমা হয়েছে। Admin payment যাচাই করছেন।</p> : <div className="flex flex-wrap gap-2"><input aria-label="Bangla QR transaction ID" maxLength={100} value={banglaQrTransactionId} onChange={(event) => setBanglaQrTransactionId(event.target.value)} placeholder="Payment TrxID" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2" /><button type="button" disabled={pending || banglaQrTransactionId.trim().length < 4} onClick={submitQrTrxId} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">TrxID জমা দিন</button></div>}
          </div>
        </div>
      )}

      {showMethods && (canChangePayment || canPayNow) && (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          <PaymentMethodSelector setPaymentSelection={setPaymentSelection} hideCod />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setShowMethods(false);
                setPaymentSelection(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2"
            >
              <X className="h-4 w-4" /> এখন নয়
            </button>
            <button
              type="button"
              disabled={pending || !paymentSelection}
              onClick={startPayment}
              className="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
            >
              {pending ? "প্রসেস হচ্ছে…" : "পেমেন্ট নিশ্চিত করুন"}
            </button>
          </div>
        </div>
      )}

      {showAddress && localOrder.status === "PENDING" && (
        <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold sm:col-span-2">সম্পূর্ণ ঠিকানা<textarea rows={3} maxLength={500} value={addressForm.deliveryAddress} onChange={(event) => setAddressForm({ ...addressForm, deliveryAddress: event.target.value })} className="rounded-xl border border-slate-300 p-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-semibold">জেলা<input maxLength={100} value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} className="rounded-xl border border-slate-300 p-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-semibold">থানা/উপজেলা<input maxLength={100} value={addressForm.thana} onChange={(event) => setAddressForm({ ...addressForm, thana: event.target.value })} className="rounded-xl border border-slate-300 p-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-semibold sm:col-span-2">ডেলিভারি এলাকা<select value={addressForm.deliveryArea} onChange={(event) => setAddressForm({ ...addressForm, deliveryArea: event.target.value })} className="rounded-xl border border-slate-300 p-3 font-normal"><option value="inside-dhaka">ঢাকার ভিতরে</option><option value="outside-dhaka">ঢাকার বাইরে</option></select></label>
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setShowAddress(false)} className="rounded-xl border px-4 py-2">ফিরে যান</button><button type="button" disabled={pending} onClick={updateAddress} className="rounded-xl bg-brand px-5 py-2 font-semibold text-white disabled:opacity-50">{pending ? "আপডেট হচ্ছে…" : "ঠিকানা আপডেট করুন"}</button></div>
        </div>
      )}

      {showCancel && localOrder.status === "PENDING" && (
        <div className="mt-4 space-y-3 border-t border-red-100 pt-4">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            বাতিল করার কারণ (ঐচ্ছিক)
            <textarea
              rows={3}
              maxLength={500}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              className="rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-red-400"
              placeholder="কেন অর্ডারটি বাতিল করছেন?"
            />
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowCancel(false)}
              className="rounded-xl border border-slate-300 px-4 py-2"
            >
              ফিরে যান
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={cancelOrder}
              className="rounded-xl bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
            >
              {pending ? "বাতিল হচ্ছে…" : "অর্ডার বাতিল নিশ্চিত করুন"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
