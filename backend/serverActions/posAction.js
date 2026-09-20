"use server";

import { createCourierDeliveryAction } from "@/backend/serverActions/courierAction";
import { postCustomerPaymentInTransaction } from "@/backend/services/paymentPostingService";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateCode } from "../utils/generateCode";
import { requireCurrentStoreId } from "../services/storeContextService";
import { actionError, requireProcurementPermission } from "../utils/procurement";

const clean = (value) => String(value || "").trim();
const DHAKA_OFFSET = 6 * 60 * 60 * 1000;

function dhakaDateRange(range, customStart, customEnd) {
  const shiftedNow = new Date(Date.now() + DHAKA_OFFSET);
  const year = shiftedNow.getUTCFullYear();
  const month = shiftedNow.getUTCMonth();
  const date = shiftedNow.getUTCDate();
  const boundary = (y, m, d) => new Date(Date.UTC(y, m, d) - DHAKA_OFFSET);
  const today = boundary(year, month, date);
  if (range === "YESTERDAY") return { gte: new Date(today.getTime() - 86400000), lt: today };
  if (range === "THIS_WEEK") {
    const daysFromMonday = (shiftedNow.getUTCDay() + 6) % 7;
    return { gte: new Date(today.getTime() - daysFromMonday * 86400000), lt: new Date(today.getTime() + 86400000) };
  }
  if (range === "THIS_MONTH") return { gte: boundary(year, month, 1), lt: boundary(year, month + 1, 1) };
  if (range === "CUSTOM" && /^\d{4}-\d{2}-\d{2}$/.test(customStart) && /^\d{4}-\d{2}-\d{2}$/.test(customEnd)) {
    const [startYear, startMonth, startDate] = customStart.split("-").map(Number);
    const [endYear, endMonth, endDate] = customEnd.split("-").map(Number);
    const gte = boundary(startYear, startMonth - 1, startDate);
    const lt = boundary(endYear, endMonth - 1, endDate + 1);
    if (gte < lt) return { gte, lt };
  }
  return { gte: today, lt: new Date(today.getTime() + 86400000) };
}

export async function getPosSales(params = {}) {
  try {
    await requireProcurementPermission("pos", "view");
    const storeId = await requireCurrentStoreId();
    const range = ["TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH", "CUSTOM"].includes(params.range) ? params.range : "TODAY";
    const createdAt = dhakaDateRange(range, clean(params.startDate), clean(params.endDate));
    const warehouseId = clean(params.warehouseId);
    const page = Math.max(1, Number(params.salesPage) || 1);
    const limit = 15;
    if (!warehouseId) throw new Error("Select a warehouse before viewing POS sales.");
    const warehouseMarker = `POS_WAREHOUSE:${warehouseId}`;
    const where = {
      storeId,
      createdAt,
      payments: { some: { gateway: "POS", status: "PAID" } },
      OR: [
        { adminNote: warehouseMarker },
        { adminNote: null, deliveries: { some: { warehouseId } } },
      ],
    };
    const [sales, total, totals, siteSetting] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNo: true,
          customerName: true,
          phoneNumber: true,
          orderPrice: true,
          adminDiscount: true,
          deliveryCharge: true,
          paidAmount: true,
          paymentStatus: true,
          status: true,
          note: true,
          createdAt: true,
          orderItems: { select: { id: true, productName: true, sku: true, quantity: true, price: true } },
          deliveries: { take: 1, select: { warehouse: { select: { name: true, address: true } } } },
          payments: {
            where: { gateway: "POS", status: "PAID" },
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { id: true, amount: true, paidAt: true, moneyAccount: { select: { name: true, type: true } } },
          },
        },
      }),
      prisma.order.count({ where }),
      prisma.order.aggregate({ where, _sum: { paidAmount: true } }),
      prisma.siteSetting.findUnique({
        where: { storeId },
        select: { name: true, slogan: true, phoneNumber1: true, phoneNumber2: true, adress1: true, adress2: true, email: true },
      }),
    ]);
    return {
      success: true,
      data: sales.map((sale) => ({ ...sale, createdAt: sale.createdAt.toISOString(), payments: sale.payments.map((payment) => ({ ...payment, paidAt: payment.paidAt?.toISOString() || null })) })),
      summary: { count: total, total: totals._sum.paidAmount || 0 },
      siteSetting,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      filters: { range, startDate: clean(params.startDate), endDate: clean(params.endDate), warehouseId },
    };
  } catch (error) {
    return actionError(error, "Failed to load POS sales.");
  }
}

export async function searchPosProducts({ warehouseId, query = "", page = 1 }) {
  try {
    await requireProcurementPermission("pos", "create");
    const storeId = await requireCurrentStoreId();
    const selectedWarehouseId = clean(warehouseId);
    const search = clean(query);
    const currentPage = Math.max(1, Number(page) || 1);
    const limit = 12;
    if (!selectedWarehouseId) throw new Error("Select a warehouse first.");
    const where = {
      storeId,
      warehouseId: selectedWarehouseId,
      available: { gt: 0 },
      ...(search && {
        OR: [
          { variation: { is: { sku: { contains: search, mode: "insensitive" } } } },
          { variation: { is: { product: { is: { title: { contains: search, mode: "insensitive" } } } } } },
        ],
      }),
    };
    const [stocks, total] = await Promise.all([
      prisma.stock.findMany({
        where,
        skip: (currentPage - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          available: true,
          variation: {
            select: {
              id: true,
              sku: true,
              regularPrice: true,
              discountPrice: true,
              weight: true,
              product: { select: { id: true, title: true, productCode: true } },
            },
          },
        },
      }),
      prisma.stock.count({ where }),
    ]);
    return {
      success: true,
      data: stocks,
      pagination: {
        page: currentPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  } catch (error) {
    return actionError(error, "Product search failed.");
  }
}

export async function getPosPageData(params = {}) {
  try {
    await requireProcurementPermission("pos", params.tab === "sales" ? "view" : "create");
    const storeId = await requireCurrentStoreId();
    const warehouseId = clean(params.warehouseId);
    const productName = clean(params.productName);
    const sku = clean(params.sku);
    const page = Math.max(1, Number(params.page) || 1);
    const limit = 12;
    const warehouses = await prisma.warehouse.findMany({
      where: { storeId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, address: true, isDefault: true },
    });
    if (!warehouseId) {
      return { success: true, data: { warehouses, stocks: [], accounts: [], couriers: [], siteSetting: null }, pagination: { page: 1, total: 0, totalPages: 1 }, filters: params };
    }
    if (!warehouses.some((warehouse) => warehouse.id === warehouseId)) {
      throw new Error("Selected warehouse was not found.");
    }
    if (params.tab === "sales") {
      return { success: true, data: { warehouses, stocks: [], accounts: [], couriers: [], siteSetting: null }, pagination: { page: 1, total: 0, totalPages: 1 }, filters: params };
    }
    const where = {
      storeId,
      warehouseId,
      available: { gt: 0 },
      ...((sku || productName) && {
        AND: [
          ...(sku ? [{ variation: { is: { sku: { contains: sku, mode: "insensitive" } } } }] : []),
          ...(productName ? [{ variation: { is: { product: { is: { title: { contains: productName, mode: "insensitive" } } } } } }] : []),
        ],
      }),
    };
    const [stocks, total, accounts, providerRows, siteSetting] = await Promise.all([
      prisma.stock.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          available: true,
          variation: {
            select: {
              id: true,
              sku: true,
              regularPrice: true,
              discountPrice: true,
              weight: true,
              product: { select: { id: true, title: true, productCode: true } },
            },
          },
        },
      }),
      prisma.stock.count({ where }),
      prisma.moneyAccount.findMany({
        where: {
          storeId,
          isActive: true,
          type: { in: ["CASH", "BANK", "MOBILE_FINANCIAL"] },
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
        select: { id: true, name: true, type: true, balance: true },
      }),
      prisma.courierProvider.findMany({
        where: { storeId, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { moneyAccount: true, pickupPoints: { where: { storeId } } },
      }),
      prisma.siteSetting.findUnique({
        where: { storeId },
        select: { name: true, slogan: true, phoneNumber1: true, phoneNumber2: true, adress1: true, adress2: true, email: true },
      }),
    ]);
    const couriers = providerRows
      .filter((provider) => getProviderRuntimeConfiguration("courier", provider).ready)
      .map((provider) => ({
        id: provider.id,
        name: provider.name,
        adapterKey: provider.adapterKey,
        pickupPoints: provider.pickupPoints.map((point) => ({ id: point.id, name: point.name, address: point.address, storeId: point.externalStoreId })),
      }));
    return {
      success: true,
      data: { warehouses, stocks, accounts, couriers, siteSetting },
      pagination: { page, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      filters: params,
    };
  } catch (error) {
    return actionError(error, "Failed to load POS.");
  }
}

export async function createPosSale(formData) {
  try {
    const userId = await requireProcurementPermission("pos", "create");
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const warehouseId = clean(values.warehouseId);
    const moneyAccountId = clean(values.moneyAccountId);
    const fulfillment = values.fulfillment === "COURIER" ? "COURIER" : "CUSTOMER_PICKUP";
    const requested = JSON.parse(values.items || "[]");
    if (!Array.isArray(requested) || !requested.length) throw new Error("Sale items are required.");
    const quantities = new Map();
    for (const item of requested) {
      const variationId = clean(item?.variationId);
      const quantity = Number(item?.quantity);
      if (!variationId || !Number.isSafeInteger(quantity) || quantity <= 0) throw new Error("Sale quantities must be positive whole numbers.");
      const totalQuantity = (quantities.get(variationId) || 0) + quantity;
      if (!Number.isSafeInteger(totalQuantity)) throw new Error("Sale quantity is too large.");
      quantities.set(variationId, totalQuantity);
    }
    if (!warehouseId || !moneyAccountId || !quantities.size) {
      throw new Error("Warehouse, payment account, and sale items are required.");
    }
    if (fulfillment === "COURIER" && !clean(values.courierProviderId)) {
      throw new Error("Select a courier provider.");
    }

    const sale = await prisma.$transaction(async (tx) => {
      const courierProviderId = clean(values.courierProviderId);
      const pickupPointId = clean(values.pickupPointId);
      const [warehouse, account, stocks, courier, pickupPoint] = await Promise.all([
        tx.warehouse.findUnique({ where: { id: warehouseId, storeId } }),
        tx.moneyAccount.findUnique({ where: { id: moneyAccountId, storeId } }),
        tx.stock.findMany({
          where: { storeId, warehouseId, variationId: { in: [...quantities.keys()] }, variation: { product: { storeId } } },
          include: { variation: { include: { product: true } } },
        }),
        fulfillment === "COURIER"
          ? tx.courierProvider.findUnique({ where: { id: courierProviderId, storeId } })
          : null,
        fulfillment === "COURIER" && pickupPointId
          ? tx.courierPickupPoint.findUnique({ where: { id: pickupPointId, storeId } })
          : null,
      ]);
      if (!warehouse) throw new Error("Warehouse was not found.");
      if (!account?.isActive) throw new Error("Payment account is unavailable.");
      if (fulfillment === "COURIER" && !courier?.isActive) throw new Error("Courier provider is unavailable.");
      if (pickupPointId && (!pickupPoint || pickupPoint.courierProviderId !== courier.id)) {
        throw new Error("Pickup point does not belong to the selected courier.");
      }
      if (stocks.length !== quantities.size) throw new Error("One or more products are unavailable in this warehouse.");

      let subtotal = 0;
      let totalWeight = 0;
      for (const stock of stocks) {
        if (!stock.variation.productId || !stock.variation.product) {
          throw new Error(`Product is unavailable for ${stock.variation.sku}.`);
        }
        const quantity = quantities.get(stock.variationId);
        if (stock.available < quantity) throw new Error(`${stock.variation.product?.title || stock.variation.sku} has only ${stock.available} available.`);
        const price = Number(stock.variation.discountPrice ?? stock.variation.regularPrice);
        if (!Number.isFinite(price) || price < 0) throw new Error(`Price is unavailable for ${stock.variation.sku}.`);
        subtotal += price * quantity;
        totalWeight += Number(stock.variation.weight || 0) * quantity;
      }
      const discount = Math.max(0, Number(values.discount) || 0);
      const deliveryCharge = fulfillment === "COURIER" ? Math.max(0, Number(values.deliveryCharge) || 0) : 0;
      const total = Math.round((subtotal - discount + deliveryCharge) * 100) / 100;
      if (discount > subtotal || total <= 0) throw new Error("Sale total must be greater than zero.");

      const counter = await tx.orderCounter.upsert({
        where: { storeId_idNo: { storeId, idNo: 11 } },
        update: { lastOrderNumber: { increment: 1 } },
        create: { storeId, idNo: 11, lastOrderNumber: 240000020 },
        select: { lastOrderNumber: true },
      });
      const orderNo = counter.lastOrderNumber.toString();
      const paymentMethod = account.type === "BANK" ? "BANK" : "CASH";
      const order = await tx.order.create({
        data: {
          storeId,
          orderNo,
          customerName: clean(values.customerName) || "Walk-in customer",
          phoneNumber: clean(values.phoneNumber) || "N/A",
          email: clean(values.email),
          orderPrice: subtotal,
          orderWeight: totalWeight,
          adminDiscount: discount,
          deliveryCharge,
          city: clean(values.city) || null,
          thana: clean(values.thana) || null,
          deliveryAddress: clean(values.deliveryAddress) || (fulfillment === "CUSTOMER_PICKUP" ? warehouse.address || warehouse.name : ""),
          paymentMethod,
          paymentStatus: "PENDING",
          paidAmount: 0,
          dueAmount: total,
          status: fulfillment === "CUSTOMER_PICKUP" ? "DELIVERED" : "PROCESSING",
          selectedCourierProviderId: fulfillment === "COURIER" ? courier.id : null,
          adminNote: `POS_WAREHOUSE:${warehouse.id}`,
          note: clean(values.note) || `POS · ${fulfillment === "CUSTOMER_PICKUP" ? "Customer pickup" : "Courier"}`,
          ttclid: "",
        },
      });
      await tx.orderItem.createMany({
        data: stocks.map((stock, index) => ({
          orderId: order.id,
          orderNo,
          orderItemNo: index + 1,
          productName: stock.variation.product?.title || stock.variation.sku,
          sku: stock.variation.sku,
          productCode: stock.variation.product?.productCode,
          price: Number(stock.variation.discountPrice ?? stock.variation.regularPrice),
          quantity: quantities.get(stock.variationId),
          productId: stock.variation.productId,
          variationId: stock.variationId,
        })),
      });
      const payment = await tx.payment.create({
        data: { storeId, orderId: order.id, gateway: "POS", paymentMethod, moneyAccountId: account.id, amount: total, status: "PENDING" },
      });

      if (fulfillment === "CUSTOMER_PICKUP") {
        const deliveryNo = await generateCode(tx, { name: "DELIVERY", prefix: "DEL-", padding: 7 });
        await tx.delivery.create({
          data: { storeId, deliveryNo, orderId: order.id, warehouseId, status: "DELIVERED", deliveredAt: new Date(), note: "POS customer pickup", createdBy: userId, updatedBy: userId },
        });
        for (const stock of stocks) {
          const quantity = quantities.get(stock.variationId);
          const debited = await tx.stock.updateMany({
            where: { id: stock.id, storeId, quantity: { gte: quantity }, available: { gte: quantity } },
            data: { quantity: { decrement: quantity }, available: { decrement: quantity }, updatedBy: userId },
          });
          if (debited.count !== 1) throw new Error(`Stock changed while selling ${stock.variation.sku}. Try again.`);
          const updatedStock = await tx.stock.findUnique({ where: { id: stock.id, storeId }, select: { quantity: true } });
          await tx.inventoryTransaction.create({
            data: { storeId, warehouseId, variationId: stock.variationId, type: "OUT", quantity: -quantity, balanceAfter: updatedStock.quantity, referenceType: "SALE", referenceId: order.id, remarks: `POS customer pickup ${orderNo}`, createdBy: userId },
          });
        }
      }

      await tx.orderTimeline.create({
        data: { orderId: order.id, orderNo, status: order.status, title: "POS Sale", message: fulfillment === "CUSTOMER_PICKUP" ? `Paid and collected from ${warehouse.name}.` : "Paid at POS and sent for courier booking.", createdBy: userId },
      });
      await postCustomerPaymentInTransaction(tx, {
        storeId,
        paymentId: payment.id,
        amount: total,
        moneyAccountIdOverride: account.id,
        providerCodeOverride: "POS",
        providerNameOverride: `POS · ${account.name}`,
        transactionId: clean(values.reference) || `POS-${orderNo}`,
        externalEventId: `POS_SALE:${order.id}`,
        paidAt: new Date(),
        createdBy: userId,
      });
      return {
        order,
        total,
        receipt: {
          orderNo,
          soldAt: order.createdAt.toISOString(),
          customerName: order.customerName,
          phoneNumber: order.phoneNumber,
          fulfillment,
          warehouseName: warehouse.name,
          warehouseAddress: warehouse.address,
          accountName: account.name,
          accountType: account.type,
          subtotal,
          discount,
          deliveryCharge,
          total,
          items: stocks.map((stock) => {
            const itemQuantity = quantities.get(stock.variationId);
            const price = Number(stock.variation.discountPrice ?? stock.variation.regularPrice);
            return {
              title: stock.variation.product?.title || stock.variation.sku,
              sku: stock.variation.sku,
              quantity: itemQuantity,
              price,
              total: price * itemQuantity,
            };
          }),
        },
      };
    }, { timeout: 30000 });

    let courierWarning = null;
    if (fulfillment === "COURIER") {
      const courierForm = new FormData();
      courierForm.set("courierProviderId", clean(values.courierProviderId));
      courierForm.set("pickupPointId", clean(values.pickupPointId));
      courierForm.set("invoice", sale.order.orderNo);
      courierForm.set("name", sale.order.customerName);
      courierForm.set("phone", sale.order.phoneNumber);
      courierForm.set("address", sale.order.deliveryAddress);
      courierForm.set("city", sale.order.city || "");
      courierForm.set("price", "0");
      courierForm.set("weight", String(sale.order.orderWeight || 0.5));
      courierForm.set("note", clean(values.note));
      const booked = await createCourierDeliveryAction({ formData: courierForm });
      if (!booked.success) courierWarning = booked.message;
    }

    revalidatePath("/admin/pos");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/procurement/stock");
    revalidatePath("/admin/procurement/deliveries");
    revalidatePath("/admin/accounts");
    return {
      success: true,
      message: courierWarning ? `Sale completed, but courier booking failed: ${courierWarning}` : `POS sale ${sale.order.orderNo} completed.`,
      data: { orderId: sale.order.id, orderNo: sale.order.orderNo, total: sale.total, receipt: sale.receipt, courierWarning },
    };
  } catch (error) {
    return actionError(error, "POS sale failed.");
  }
}
