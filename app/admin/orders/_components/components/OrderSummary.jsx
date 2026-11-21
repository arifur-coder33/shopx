import SSLCommerzPayButton from "@/components/payments/SSLCommerzPayButton";

export default function OrderSummary({
  subtotal,
  delivery,
  courierFinalDeliveryFee,
  adminDiscount,
  total,
  dueAmount,
  paidAmount,
  orderId,
  paymentMethod,
}) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Order Subtotal </h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between ">
          <span>Subtotal</span>
          <span>{subtotal} BDT</span>
        </div>
        <div className="flex justify-between ">
          <span>Delivery Charge</span>
          <span>+ {delivery} BDT</span>
        </div>
        {courierFinalDeliveryFee !== undefined && (
          <div className="flex justify-between text-text-muted">
            <span>Courier final delivery fee</span>
            <span>{courierFinalDeliveryFee == null ? "Awaiting courier update" : `${courierFinalDeliveryFee} BDT`}</span>
          </div>
        )}
        <div className="flex justify-between text-red-500">
          <span>Extra Discount</span>
          <span>- {adminDiscount} BDT</span>
        </div>
        <div className="border-t pt-3 mt-3 flex justify-between items-center">
          <span className="font-bold text-lg 0">Total Amount</span>
          <span className="font-bold text-xl ">{total} BDT</span>
        </div>
        <div className="flex justify-between text-lg text-green-500">
          <span>Paid Amountt</span>
          <span> {paidAmount} BDT</span>
        </div>
        <div className="border-t pt-3 text-lg   mt-3 flex justify-between items-center">
          <span className="font-bold ">Due Amount</span>
          <span className="font-bold text-red-500 ">{dueAmount} BDT</span>
        </div>
        {dueAmount > 0 && paymentMethod !== "COD" && (
          <div className="border-t pt-3 text-lg   mt-3 flex justify-between items-end">
            <SSLCommerzPayButton orderId={orderId} />
          </div>
        )}
      </div>
    </div>
  );
}
