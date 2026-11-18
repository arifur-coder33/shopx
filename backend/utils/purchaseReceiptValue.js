const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function getPurchaseReceiveSummary(purchaseOrder) {
  const items = purchaseOrder?.items || [];
  const totalOrdered = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const activeExpenses = (purchaseOrder?.expenses || []).filter((expense) => !expense.voidedAt).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const landedCosts = Number(purchaseOrder?.shippingCost || 0) + activeExpenses;
  const baseTotal = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0) * Number(item.unitCost || 0) - Number(item.discount || 0)), 0);
  const orderDiscount = Math.max(0, Number(purchaseOrder?.discount || 0));
  const vat = Math.max(0, Number(purchaseOrder?.vat || 0));
  const rows = items.map((item) => {
    const ordered = Number(item.quantity || 0);
    const received = Math.min(ordered, Number(item.receivedQty || 0));
    const pending = Math.max(0, ordered - received);
    const itemBase = Math.max(0, ordered * Number(item.unitCost || 0) - Number(item.discount || 0));
    const share = baseTotal ? itemBase / baseTotal : 0;
    const itemValue = Math.max(0, itemBase - orderDiscount * share + vat * share) + (totalOrdered ? landedCosts * ordered / totalOrdered : 0);
    const unitValue = ordered ? itemValue / ordered : 0;
    return { ...item, ordered, received, pending, unitValue, receivedValue: roundMoney(received * unitValue), pendingValue: roundMoney(pending * unitValue) };
  });
  const orderedValue = roundMoney(rows.reduce((sum, row) => sum + row.ordered * row.unitValue, 0));
  const receivedValue = roundMoney(rows.reduce((sum, row) => sum + row.receivedValue, 0));
  const pendingReceiveValue = roundMoney(rows.reduce((sum, row) => sum + row.pendingValue, 0));
  const totalQuantity = rows.reduce((sum, row) => sum + row.ordered, 0);
  const receivedQuantity = rows.reduce((sum, row) => sum + row.received, 0);
  const status = purchaseOrder?.status === "CANCELLED" ? "CANCELLED" : receivedQuantity === 0 ? "PENDING" : receivedQuantity >= totalQuantity ? "RECEIVED" : "PARTIAL";
  return { rows, orderedQuantity: totalQuantity, receivedQuantity, pendingQuantity: Math.max(0, totalQuantity - receivedQuantity), orderedValue, receivedValue, pendingReceiveValue, status };
}

export { roundMoney };
