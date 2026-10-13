"use server";

import { createCourierDeliveryAction } from "@/backend/serverActions/courierAction";
import { postCustomerPaymentInTransaction } from "@/backend/services/paymentPostingService";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyOrderCreated } from "@/backend/services/orderRealtimeService";
import { firePurchaseServer } from "@/backend/serverActions/SocialPurchaseEventAction";
import { generateCode } from "../utils/generateCode";
import { actionError, requireProcurementPermission } from "../utils/procurement";
import { findSearchProducts } from "../utils/findSearchProducts";

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
    const range = ["TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH", "CUSTOM"].includes(params.range) ? params.range : "TODAY";
    const createdAt = dhakaDateRange(range, clean(params.startDate), clean(params.endDate));
    const warehouseId = clean(params.warehouseId);
    const page = Math.max(1, Number(params.salesPage) || 1);
    const limit = 15;
    if (!warehouseId) throw new Error("Select a warehouse before viewing POS sales.");
    const warehouseMarker = `POS_WAREHOUSE:${warehouseId}`;
    const where = {
      createdAt,
      OR: [
        { adminNote: { startsWith: warehouseMarker } },
        {
          AND: [
            { payments: { some: { gateway: "POS", status: "PAID" } } },
            { adminNote: null, deliveries: { some: { warehouseId } } },
          ],
        },
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
          dueAmount: true,
          paymentMethod: true,
          paymentStatus: true,
          status: true,
          note: true,
          user: { select: { name: true } },
          createdAt: true,
          orderItems: { select: { id: true, productName: true, sku: true, quantity: true, price: true } },
          deliveries: { take: 1, select: { warehouse: { select: { name: true, address: true } } } },
          shipping: { select: { cod: true } },
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
      prisma.siteSetting.findFirst({
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
    const selectedWarehouseId = clean(warehouseId);
    const search = clean(query);
    const currentPage = Math.max(1, Number(page) || 1);
    const limit = 12;
    if (!selectedWarehouseId) throw new Error("Select a warehouse first.");
    const select = {
      id: true,
      available: true,
      variation: {
        select: {
          id: true,
          sku: true,
          regularPrice: true,
          discountPrice: true,
          weight: true,
          product: { select: { id: true, title: true, productCode: true, thumbnail: { select: { name: true } } } },
        },
      },
    };
    const baseWhere = { warehouseId: selectedWarehouseId, available: { gt: 0 } };
    // Scanners usually type the SKU and finish with Enter. Resolve the exact
    // SKU first so it cannot be hidden by the normal search pagination.
    if (search) {
      const exactSku = await prisma.stock.findFirst({
        where: { ...baseWhere, variation: { is: { sku: { equals: search, mode: "insensitive" } } } },
        select,
      });
      if (exactSku) {
        return { success: true, data: [exactSku], barcodeMatch: "sku", pagination: { page: 1, total: 1, totalPages: 1 } };
      }
    }
    const productCodeStocks = search ? await prisma.stock.findMany({
      where: {
        ...baseWhere,
        variation: {
          is: {
            product: {
              is: { productCode: { equals: search, mode: "insensitive" } },
            },
          },
        },
      },
      take: 2,
      select,
    }) : [];
    if (productCodeStocks.length === 1) {
      return { success: true, data: productCodeStocks, barcodeMatch: "productCode", pagination: { page: 1, total: 1, totalPages: 1 } };
    }
    const matchingProducts = search ? await findSearchProducts(search, { id: true }, 50) : [];
    const matchingProductIds = matchingProducts.map((product) => product.id);
    const where = {
      ...baseWhere,
      ...(search && {
        OR: [
          { variation: { is: { sku: { contains: search, mode: "insensitive" } } } },
          { variation: { is: { product: { is: { title: { contains: search, mode: "insensitive" } } } } } },
          {
            variation: {
              is: {
                product: {
                  is: { productCode: { equals: search, mode: "insensitive" } },
                },
              },
            },
          },
          ...(matchingProductIds.length ? [{ variation: { is: { productId: { in: matchingProductIds } } } }] : []),
        ],
      }),
    };
    const [stocks, total] = await Promise.all([
      prisma.stock.findMany({
        where,
        skip: (currentPage - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select,
      }),
      prisma.stock.count({ where }),
    ]);
    return {
      success: true,
      data: stocks,
      ...(productCodeStocks.length > 1 && { barcodeMatch: "ambiguous" }),
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
    const warehouseId = clean(params.warehouseId);
    const warehouses = await prisma.warehouse.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, address: true, isDefault: true },
    });
    if (!warehouseId) {
      return { success: true, data: { warehouses, stocks: [], accounts: [], couriers: [], manualCouriers: [], siteSetting: null }, pagination: { page: 1, total: 0, totalPages: 1 }, filters: params };
    }
    if (!warehouses.some((warehouse) => warehouse.id === warehouseId)) {
      throw new Error("Selected warehouse was not found.");
    }
    if (params.tab === "sales") {
      return { success: true, data: { warehouses, stocks: [], accounts: [], couriers: [], manualCouriers: [], siteSetting: null }, pagination: { page: 1, total: 0, totalPages: 1 }, filters: params };
    }
    const [accounts, providerRows, siteSetting] = await Promise.all([
      prisma.moneyAccount.findMany({
        where: {
          isActive: true,
          type: { in: ["CASH", "BANK", "MOBILE_FINANCIAL"] },
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
        select: { id: true, name: true, type: true, balance: true },
      }),
      prisma.courierProvider.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { moneyAccount: true, pickupPoints: true },
      }),
      prisma.siteSetting.findFirst({
        select: { name: true, slogan: true, phoneNumber1: true, phoneNumber2: true, adress1: true, adress2: true, email: true },
      }),
    ]);
    const manualCouriers = providerRows
      .filter((provider) => provider.isActive && provider.code !== "MANUAL")
      .map((provider) => ({
        id: provider.id,
        name: provider.name,
        adapterKey: provider.adapterKey,
        deliveryFeeConfig: provider.adapterKey === "MANUAL" ? provider.nonSecretConfig || {} : null,
      }));
    const couriers = providerRows
      .filter((provider) => provider.adapterKey !== "MANUAL" && getProviderRuntimeConfiguration("courier", provider).ready)
      .map((provider) => ({
        id: provider.id,
        name: provider.name,
        adapterKey: provider.adapterKey,
        pickupPoints: provider.pickupPoints.map((point) => ({ id: point.id, name: point.name, address: point.address, storeId: point.storeId })),
      }));
    return {
      success: true,
      data: { warehouses, stocks: [], accounts, couriers, manualCouriers, siteSetting },
      pagination: { page: 1, total: 0, totalPages: 1 },
      filters: params,
    };
  } catch (error) {
    return actionError(error, "Failed to load POS.");
  }
}

export async function createPosSale(formData) {
  try {
    const userId = await requireProcurementPermission("pos", "create");
    const values = Object.fromEntries(formData.entries());
    const warehouseId = clean(values.warehouseId);
    const moneyAccountId = clean(values.moneyAccountId);
    const fulfillment = values.fulfillment === "COURIER" ? "COURIER" : "CUSTOMER_PICKUP";
    const courierDispatch = values.courierDispatch === "DIRECT" ? "DIRECT" : "QUEUE";
    const manualEntry = values.manualEntry === "true";
    const requested = JSON.parse(values.items || "[]");
    const quantities = new Map();
    for (const item of requested) {
      const variationId = clean(item.variationId);
      const quantity = Number(item.quantity);
      if (variationId && Number.isInteger(quantity) && quantity > 0) {
        quantities.set(variationId, (quantities.get(variationId) || 0) + quantity);
      }
    }
    if (!warehouseId || !quantities.size) {
      throw new Error("Warehouse and sale items are required.");
    }
    if (fulfillment === "COURIER" && !clean(values.courierProviderId)) {
      throw new Error("Select a courier provider.");
    }
    if (fulfillment === "COURIER" && manualEntry && !clean(values.cn)) {
      throw new Error("Enter the courier consignment number.");
    }
    const seller = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    const sale = await prisma.$transaction(async (tx) => {
      const [warehouse, account, stocks] = await Promise.all([
        tx.warehouse.findUnique({ where: { id: warehouseId } }),
        moneyAccountId ? tx.moneyAccount.findUnique({ where: { id: moneyAccountId } }) : null,
        tx.stock.findMany({
          where: { warehouseId, variationId: { in: [...quantities.keys()] } },
          include: { variation: { include: { product: true } } },
        }),
      ]);
      if (!warehouse) throw new Error("Warehouse was not found.");
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
      const receivedValue = fulfillment === "CUSTOMER_PICKUP"
        ? total
        : Number(clean(values.receivedNow) || 0);
      const receivedNow = Math.round(receivedValue * 100) / 100;
      if (!Number.isFinite(receivedNow) || receivedNow < 0 || receivedNow > total) {
        throw new Error("Received amount must be between zero and the sale total.");
      }
      if (receivedNow > 0 && !account?.isActive) throw new Error("Select an active account for the amount received.");
      const codAmount = Math.round((total - receivedNow) * 100) / 100;
      const paidUsing = account?.type === "CASH" ? "CASH" : "BANK";
      const paymentMethod = fulfillment === "COURIER" && codAmount > 0 ? "COD" : paidUsing;

      const counter = await tx.orderCounter.upsert({
        where: { idNo: 11 },
        update: { lastOrderNumber: { increment: 1 } },
        create: { idNo: 11, lastOrderNumber: 240000020 },
        select: { lastOrderNumber: true },
      });
      const orderNo = counter.lastOrderNumber.toString();
      const order = await tx.order.create({
        data: {
          orderNo,
          userId,
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
          paymentStatus: receivedNow > 0 ? "PENDING" : "UNPAID",
          paidAmount: 0,
          dueAmount: total,
          status: fulfillment === "CUSTOMER_PICKUP" ? "DELIVERED" : "PROCESSING",
          selectedCourierProviderId: fulfillment === "COURIER" ? clean(values.courierProviderId) : null,
          adminNote: fulfillment === "COURIER"
            ? `POS_WAREHOUSE:${warehouse.id}:RESERVED`
            : `POS_WAREHOUSE:${warehouse.id}`,
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
      const payment = receivedNow > 0 ? await tx.payment.create({
        data: { orderId: order.id, gateway: "POS", paymentMethod: paidUsing, moneyAccountId: account.id, amount: receivedNow, status: "PENDING" },
      }) : null;

      if (fulfillment === "CUSTOMER_PICKUP") {
        const deliveryNo = await generateCode(tx, { name: "DELIVERY", prefix: "DEL-", padding: 7 });
        await tx.delivery.create({
          data: { deliveryNo, orderId: order.id, warehouseId, status: "DELIVERED", deliveredAt: new Date(), note: "POS customer pickup", createdBy: userId, updatedBy: userId },
        });
        for (const stock of stocks) {
          const quantity = quantities.get(stock.variationId);
          const debited = await tx.stock.updateMany({
            where: { id: stock.id, available: { gte: quantity } },
            data: { quantity: { decrement: quantity }, available: { decrement: quantity }, updatedBy: userId },
          });
          if (debited.count !== 1) throw new Error(`Stock changed while selling ${stock.variation.sku}. Try again.`);
          await tx.inventoryTransaction.create({
            data: { warehouseId, variationId: stock.variationId, type: "OUT", quantity: -quantity, balanceAfter: stock.quantity - quantity, referenceType: "SALE", referenceId: order.id, remarks: `POS customer pickup ${orderNo}`, createdBy: userId },
          });
        }
      } else {
        // Keep courier-bound POS quantities out of the available-to-sell count
        // while they wait in the delivery queue.
        for (const stock of stocks) {
          const quantity = quantities.get(stock.variationId);
          const reserved = await tx.stock.updateMany({
            where: { id: stock.id, available: { gte: quantity } },
            data: { reserved: { increment: quantity }, available: { decrement: quantity }, updatedBy: userId },
          });
          if (reserved.count !== 1) throw new Error(`Stock changed while reserving ${stock.variation.sku}. Try again.`);
        }
      }

      await tx.orderTimeline.create({
        data: { orderId: order.id, orderNo, status: order.status, title: "POS Sale", message: fulfillment === "CUSTOMER_PICKUP" ? `Paid and collected from ${warehouse.name}.` : `POS order confirmed. Received now: ${receivedNow}; courier COD: ${codAmount}.`, createdBy: userId },
      });
      if (payment) {
        await postCustomerPaymentInTransaction(tx, {
          paymentId: payment.id,
          amount: receivedNow,
          moneyAccountIdOverride: account.id,
          providerCodeOverride: "POS",
          providerNameOverride: `POS · ${account.name}`,
          transactionId: clean(values.reference) || `POS-${orderNo}`,
          externalEventId: `POS_SALE:${order.id}`,
          paidAt: new Date(),
          createdBy: userId,
        });
      }
      return {
        order,
        total,
        receivedNow,
        codAmount,
        receipt: {
          orderNo,
          soldAt: order.createdAt.toISOString(),
          customerName: order.customerName,
          phoneNumber: order.phoneNumber,
          fulfillment,
          warehouseName: warehouse.name,
          warehouseAddress: warehouse.address,
          accountName: receivedNow > 0 ? account.name : "Courier COD",
          accountType: receivedNow > 0 ? account.type : "COD",
          sellerName: seller?.name || "Admin",
          subtotal,
          discount,
          deliveryCharge,
          total,
          receivedNow,
          codAmount,
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
    });

    after(() => notifyOrderCreated(sale.order.id));
    let courierWarning = null;
    if (fulfillment === "COURIER") {
      const courierForm = new FormData();
      courierForm.set("courierProviderId", clean(values.courierProviderId));
      courierForm.set("pickupPointId", clean(values.pickupPointId));
      if (manualEntry) {
        courierForm.set("manualEntry", "true");
        courierForm.set("cn", clean(values.cn));
      }
      courierForm.set("invoice", sale.order.orderNo);
      courierForm.set("name", sale.order.customerName);
      courierForm.set("phone", sale.order.phoneNumber);
      courierForm.set("address", sale.order.deliveryAddress);
      courierForm.set("city", sale.order.city || "");
      courierForm.set("price", String(sale.codAmount));
      courierForm.set("weight", String(sale.order.orderWeight || 0.5));
      courierForm.set("note", clean(values.note));
      const booked = await createCourierDeliveryAction({ formData: courierForm });
      if (!booked.success) courierWarning = booked.message;
    }

    after(() => firePurchaseServer({ orderId: sale.order.id, actionSource: "phone_call" }));

    revalidatePath("/admin/pos");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/procurement/stock");
    revalidatePath("/admin/procurement/deliveries");
    revalidatePath("/admin/accounts");
    return {
      success: true,
      message: courierWarning
        ? `Sale completed, but courier booking failed: ${courierWarning}`
        : fulfillment === "COURIER" && courierDispatch === "QUEUE"
          ? `POS sale ${sale.order.orderNo} confirmed and added to the delivery queue.`
          : fulfillment === "COURIER"
            ? `POS sale ${sale.order.orderNo} completed and courier booking submitted.`
            : `POS sale ${sale.order.orderNo} completed.`,
      data: { orderId: sale.order.id, orderNo: sale.order.orderNo, total: sale.total, receivedNow: sale.receivedNow, codAmount: sale.codAmount, receipt: sale.receipt, courierWarning },
    };
  } catch (error) {
    return actionError(error, "POS sale failed.");
  }
}
