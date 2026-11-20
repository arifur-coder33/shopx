import { orderItemStockLines } from "@/lib/bundleStock";

export async function assertOwnStockVariants(tx, variationIds) {
  const componentBundle = await tx.productVariation.findFirst({
    where: { id: { in: variationIds }, product: { stockMode: "COMPONENT_BASED" } },
    select: { sku: true },
  });
  if (componentBundle) throw new Error(`${componentBundle.sku} uses component stock. Post stock on its component SKUs.`);
}

function requiredStock(items) {
  const totals = new Map();
  for (const item of items) {
    for (const line of orderItemStockLines(item)) {
      totals.set(line.variationId, (totals.get(line.variationId) || 0) + line.quantity);
    }
  }
  return [...totals].sort(([a], [b]) => a.localeCompare(b));
}

export async function reserveBundleOrder(tx, items) {
  if (!items.some(({ bundleComponents }) => bundleComponents?.length)) return null;
  const requirements = requiredStock(items);
  const stocks = await tx.stock.findMany({
    where: { variationId: { in: requirements.map(([id]) => id) }, available: { gt: 0 } },
    select: { warehouseId: true, variationId: true, available: true, warehouse: { select: { isDefault: true } } },
    orderBy: { warehouseId: "asc" },
  });
  const byWarehouse = new Map();
  for (const stock of stocks) {
    if (!byWarehouse.has(stock.warehouseId)) byWarehouse.set(stock.warehouseId, { isDefault: stock.warehouse.isDefault, stock: new Map() });
    byWarehouse.get(stock.warehouseId).stock.set(stock.variationId, stock.available);
  }
  const warehouseId = [...byWarehouse].sort(([, a], [, b]) => Number(b.isDefault) - Number(a.isDefault))
    .find(([, { stock }]) => requirements.every(([id, needed]) => stock.get(id) >= needed))?.[0];
  if (!warehouseId) {
    if (items.filter(({ bundleComponents }) => bundleComponents?.length).every(({ allowBackorder }) => allowBackorder === true)) return null;
    throw new Error("এই অর্ডারের সব পণ্য ও bundle components একই গুদামে পর্যাপ্ত নেই।");
  }

  for (const [variationId, quantity] of requirements) {
    const result = await tx.stock.updateMany({
      where: { warehouseId, variationId, available: { gte: quantity } },
      data: { available: { decrement: quantity }, reserved: { increment: quantity } },
    });
    if (result.count !== 1) throw new Error("স্টক পরিবর্তিত হয়েছে। কার্ট দেখে আবার চেষ্টা করুন।");
  }
  return warehouseId;
}

export async function releaseBundleOrder(tx, orderId, { rejectPacked = true } = {}) {
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { bundleReservationWarehouseId: true } });
  const warehouseId = order?.bundleReservationWarehouseId;
  if (!warehouseId) return;
  const changed = await tx.order.updateMany({
    where: { id: orderId, bundleReservationWarehouseId: warehouseId, deliveries: { none: { status: { not: "CANCELLED" } } } },
    data: { bundleReservationWarehouseId: null },
  });
  if (!changed.count) {
    if (rejectPacked && await tx.delivery.count({ where: { orderId, status: { not: "CANCELLED" } } })) {
      throw new Error("স্টক ফেরাতে আগে প্যাক করা delivery বাতিল করুন বা return গ্রহণ করুন।");
    }
    return;
  }
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { variationId: true, quantity: true, bundleComponents: true },
  });
  for (const [variationId, quantity] of requiredStock(items)) {
    const restored = await tx.stock.updateMany({
      where: { warehouseId, variationId, reserved: { gte: quantity } },
      data: { available: { increment: quantity }, reserved: { decrement: quantity } },
    });
    if (restored.count !== 1) throw new Error("Bundle reservation no longer matches warehouse stock.");
  }
}

export async function updateCourierOrderStatus(prisma, order, status, guard) {
  const updateStatus = async (db) => {
    if (!guard) return db.order.update({ where: { id: order.id }, data: { status } });
    const result = await db.order.updateMany({
      where: { id: order.id, status: guard.expectedStatus, shipping: { is: { id: guard.shippingId } } },
      data: { status },
    });
    return result.count > 0;
  };
  if (!order.bundleReservationWarehouseId) {
    return updateStatus(prisma);
  }
  return prisma.$transaction(async (tx) => {
    const updated = await updateStatus(tx);
    if (!updated) return false;
    if (status === "CANCELLED") await releaseBundleOrder(tx, order.id, { rejectPacked: false });
    if (["SHIPPED", "DELIVERED"].includes(status) && !guard?.allowEarlyShipment && !await tx.delivery.count({
      where: { orderId: order.id, status: { not: "CANCELLED" } },
    })) {
      throw new Error("Prepare the bundle delivery before applying the courier status.");
    }
    return updated;
  }, { isolationLevel: "Serializable" });
}
