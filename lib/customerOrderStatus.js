export const CUSTOMER_ORDER_STATUS_GROUPS = Object.freeze({
  all: null,
  running: ["PENDING", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERY_FAILED"],
  cancelled: ["CANCELLED", "FAILED_RETURNING", "FAILED_RETURN_RECEIVED"],
  delivered: ["DELIVERED", "RETURNING", "RETURNED"],
  refunded: ["REFUNDING", "REFUNDED"],
});
