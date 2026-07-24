export default function OrderSummary({
  subtotal,
  delivery,
  adminDiscount,
  total,
}) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between ">
          <span>Subtotal</span>
          <span>{subtotal} BDT</span>
        </div>
        <div className="flex justify-between ">
          <span>Delivery Charge</span>
          <span>+ {delivery} BDT</span>
        </div>
        <div className="flex justify-between text-red-500">
          <span>Extra Discount</span>
          <span>- {adminDiscount} BDT</span>
        </div>
        <div className="border-t pt-3 mt-3 flex justify-between items-center">
          <span className="font-bold text-lg 0">Total Amount</span>
          <span className="font-bold text-xl ">{total} BDT</span>
        </div>
      </div>
    </div>
  );
}
