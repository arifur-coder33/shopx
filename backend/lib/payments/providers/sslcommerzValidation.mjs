// Validation API data, not browser-return parameters, is authoritative.
export function assertSSLcommerzVerifiedPayment(data, payment, validationId) {
  const expectedAmount = Number(payment.amount);
  const verifiedAmount = Number(data?.amount);
  if (
    !["VALID", "VALIDATED"].includes(data?.status) ||
    !data?.val_id || data.val_id !== validationId ||
    !data?.tran_id || !payment.transactionId ||
    data.tran_id !== payment.transactionId ||
    data.currency !== payment.currency ||
    !Number.isFinite(verifiedAmount) ||
    !Number.isFinite(expectedAmount) ||
    Math.abs(verifiedAmount - expectedAmount) >= 0.01 ||
    data.value_c !== payment.id ||
    data.value_d !== payment.orderId ||
    data.value_a !== payment.order.orderNo
  ) {
    throw new Error("SSLCommerz verified transaction does not match this payment.");
  }
}
