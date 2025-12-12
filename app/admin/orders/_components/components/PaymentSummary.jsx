export default function PaymentSummary({ order, discount }) {
  return (
    <div className="bg-slate-50 p-6 border-t border-slate-100 space-y-2">
      <div className="flex justify-between text-sm text-slate-600">
        <span>Subtotal</span>
        <span>{order.subtotal} ৳</span>
      </div>
      <div className="flex justify-between text-sm text-slate-600">
        <span>Shipping</span>
        <span>{order.deliveryCharge} ৳</span>
      </div>
      <div className="flex justify-between text-sm text-emerald-600 font-medium">
        <span>Discount</span>
        <span>-{discount} ৳</span>
      </div>
      <div className="pt-3 mt-2 border-t border-slate-200 flex justify-between items-end">
        <div>
          <span className="block text-xs text-slate-500">Total to Pay</span>
          <span className="text-lg font-bold text-slate-900">
            {order.amount} ৳
          </span>
        </div>
        <div className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 uppercase">
          {order.paymentMethod || "COD"}
        </div>
      </div>
    </div>
  );
}
