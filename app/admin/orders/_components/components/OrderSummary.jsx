export default function OrderSummary({ subtotal, delivery, discount, total }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{subtotal} BDT</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Delivery Charge</span>
          <span>+ {delivery} BDT</span>
        </div>
        <div className="flex justify-between text-red-500">
          <span>Discount</span>
          <span>- {discount} BDT</span>
        </div>
        <div className="border-t pt-3 mt-3 flex justify-between items-center">
          <span className="font-bold text-lg text-gray-900">Total Amount</span>
          <span className="font-bold text-xl text-indigo-600">{total} BDT</span>
        </div>
      </div>
    </div>
  );
}
