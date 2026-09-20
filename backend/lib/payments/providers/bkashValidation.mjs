// Execute response is authoritative only when it binds to the stored attempt.
export function assertBkashExecutedPayment(executed, payment, paymentID) {
  const amount = Number(executed?.amount);
  if (
    executed?.transactionStatus !== "Completed" ||
    !executed?.trxID ||
    !executed?.paymentID || executed.paymentID !== paymentID ||
    (executed.merchantInvoiceNumber && executed.merchantInvoiceNumber !== payment.id) ||
    executed.currency !== payment.currency ||
    !Number.isFinite(amount) ||
    Math.abs(amount - Number(payment.amount)) >= 0.01
  ) {
    throw new Error("bKash executed payment does not match this payment.");
  }
}
