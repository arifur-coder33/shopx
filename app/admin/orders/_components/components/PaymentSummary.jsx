// export default function PaymentSummary({ order, discount }) {
//   return (
//     <div className="card">
//       <div className="flex justify-between text-sm text-slate-600">
//         <span>Subtotal</span>
//         <span>{order.subtotal} ৳</span>
//       </div>
//       <div className="flex justify-between text-sm text-slate-600">
//         <span>Shipping</span>
//         <span>{order.deliveryCharge} ৳</span>
//       </div>
//       <div className="flex justify-between text-sm text-emerald-600 font-medium">
//         <span>Discount</span>
//         <span>-{discount} ৳</span>
//       </div>
//       <div className="pt-3 mt-2 border-t border-slate-200 flex justify-between items-end">
//         <div>
//           <span className="block text-xs text-slate-500">Total to Pay</span>
//           <span className="text-lg font-bold text-slate-900">
//             {order.amount} ৳
//           </span>
//         </div>
//         <div className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 uppercase">
//           {order.paymentMethod || "COD"}
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import {
  CheckCircle2,
  Clock3,
  CreditCard,
  ReceiptText,
  Wallet,
  XCircle,
} from "lucide-react";

const statusConfig = {
  PAID: {
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  PENDING: {
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock3,
  },
  FAILED: {
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  CANCELLED: {
    color: "bg-gray-100 text-gray-700",
    icon: XCircle,
  },
  PARTIALLY_REFUNDED: {
    color: "bg-orange-100 text-orange-700",
    icon: ReceiptText,
  },
  REFUNDED: {
    color: "bg-orange-100 text-orange-700",
    icon: ReceiptText,
  },
};

export default function PaymentSummary({
  payments = [],
  paidAmount = 0,
  dueAmount = 0,
  refundedAmount = 0,
}) {
  return (
    <div className="card">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <CreditCard className="text-brand" size={22} />
            Payment Summary
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Payment history & transaction details
          </p>
        </div>

        <div className="rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
          {payments.length} Payment{payments.length !== 1 && "s"}
        </div>
      </div>

      {/* Summary */}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border bg-green-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Wallet size={18} className="text-green-600" />
            <span className="text-sm text-gray-600">Paid</span>
          </div>

          <h3 className="text-2xl font-bold text-green-600">৳{paidAmount}</h3>
        </div>

        <div className="rounded-xl border bg-red-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <ReceiptText size={18} className="text-red-500" />
            <span className="text-sm text-gray-600">Due</span>
          </div>

          <h3 className="text-2xl font-bold text-red-600">৳{dueAmount}</h3>
        </div>

        <div className="rounded-xl border bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <CreditCard size={18} className="text-blue-600" />
            <span className="text-sm text-gray-600">Payments</span>
          </div>

          <h3 className="text-2xl font-bold text-blue-600">
            {payments.length}
          </h3>
        </div>

        <div className="rounded-xl border bg-orange-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <ReceiptText size={18} className="text-orange-500" />
            <span className="text-sm text-gray-600">Refunded</span>
          </div>

          <h3 className="text-2xl font-bold text-orange-600">
            ৳{refundedAmount}
          </h3>
        </div>
      </div>

      {/* Payment History */}

      <h3 className="mb-3 text-lg font-semibold">Payment History</h3>

      {payments.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">
          No payment history found.
        </div>
      )}

      {/* Mobile */}

      <div className="space-y-3 lg:hidden">
        {payments.map((payment) => {
          const StatusIcon = statusConfig[payment.status]?.icon || Clock3;

          return (
            <div
              key={payment.id}
              className="rounded-xl border bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{payment.paymentGateway?.name || payment.courierProvider?.name || payment.gateway}</h4>

                  <p className="text-xs text-gray-500">
                    {payment.paymentMethod || "-"}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                    statusConfig[payment.status]?.color
                  }`}
                >
                  <StatusIcon size={14} />
                  {payment.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Amount</span>
                  <span className="font-semibold">৳{payment.amount}</span>
                </div>

                <div className="flex justify-between">
                  <span>Store Amount</span>
                  <span>৳{payment.storeAmount ?? 0}</span>
                </div>

                <div className="flex justify-between">
                  <span>Transaction</span>

                  <span className="max-w-[140px] truncate font-mono text-xs">
                    {payment.transactionId || "-"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Card</span>

                  <span>{payment.cardBrand || payment.cardType || "-"}</span>
                </div>

                <div className="flex justify-between">
                  <span>Paid At</span>

                  <span className="text-right">
                    {payment.paidAt
                      ? new Date(payment.paidAt).toLocaleString()
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop */}

      <div className="hidden overflow-x-auto rounded-xl border lg:block">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr className="text-left text-sm">
              <th className="px-4 py-3">Gateway</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Transaction</th>
              <th className="px-4 py-3">Paid At</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => {
              const StatusIcon = statusConfig[payment.status]?.icon || Clock3;

              return (
                <tr key={payment.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium"><span className="block">{payment.paymentGateway?.name || payment.courierProvider?.name || payment.gateway}</span>{payment.moneyAccount && <small className="text-gray-500">Posted to {payment.moneyAccount.name}</small>}</td>

                  <td className="px-4 py-3">{payment.paymentMethod || "-"}</td>

                  <td className="px-4 py-3 font-semibold">৳{payment.amount}</td>

                  <td className="px-4 py-3">৳{payment.storeAmount ?? 0}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                        statusConfig[payment.status]?.color
                      }`}
                    >
                      <StatusIcon size={14} />
                      {payment.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-mono text-xs">
                    {payment.transactionId || "-"}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {payment.paidAt
                      ? new Date(payment.paidAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
