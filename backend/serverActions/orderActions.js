"use server";
import { getCheckoutDeliveryRates } from "@/backend/services/deliveryChargeService";
import { postCodCollection, postPaymentRefundInTransaction } from "@/backend/services/paymentPostingService";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import { calculateDeliveryCharge } from "@/lib/deliveryCharge";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { getIP } from "../utils/getIp";
import { getListCount } from "../utils/getListCount";
import { getListData } from "../utils/getListData";
import { getUserId } from "../utils/hasPermission";
import { addOrderTimeline } from "./orderTimelineActin";
import { firePurchaseServer } from "./SocialPurchaseEventAction";
import { requireCurrentStoreId } from "../services/storeContextService";
import { requireProcurementPermission } from "../utils/procurement";
const statusMap = {
  all: null, // no filter
  running: [
    "PENDING",
    "PROCESSING",
    "READY_TO_SHIP",
    "SHIPPED",
    "DELIVERY_FAILED",
  ],
  cancelled: ["CANCELLED", "FAILED_RETURNING", "FAILED_RETURN_RECEIVED"],
  delivered: ["DELIVERED", "RETURNING", "RETURNED"],
  refunded: ["REFUNDING", "REFUNDED"],
};

async function restoreCheckoutStock(tx, storeId, order) {
  const debits = await tx.inventoryTransaction.findMany({
    where: { storeId, referenceType: "SALE", referenceId: order.id, type: "OUT", createdBy: "checkout" },
    select: { warehouseId: true, variationId: true, quantity: true },
  });
  if (!debits.length) return;
  if (!["PENDING", "PROCESSING"].includes(order.status)) {
    throw new Error("Stock cannot be restored through cancellation after fulfilment has started.");
  }
  if (await tx.delivery.count({ where: { storeId, orderId: order.id } })) {
    throw new Error("A prepared delivery cannot be cancelled through this stock-release path.");
  }
  const alreadyRestored = await tx.inventoryTransaction.findFirst({
    where: {
      storeId, referenceType: "RETURN", referenceId: order.id,
      type: "RETURN_IN", createdBy: "checkout-cancel",
    },
    select: { id: true },
  });
  if (alreadyRestored) throw new Error("Checkout stock was already restored for this order.");
  for (const debit of debits) {
    const quantity = -debit.quantity;
    const restored = await tx.stock.updateMany({
      where: { storeId, warehouseId: debit.warehouseId, variationId: debit.variationId },
      data: {
        quantity: { increment: quantity },
        available: { increment: quantity },
        updatedBy: "checkout-cancel",
      },
    });
    if (restored.count !== 1) throw new Error("The original stock allocation could not be restored.");
    const stock = await tx.stock.findUnique({
      where: { storeId_warehouseId_variationId: {
        storeId, warehouseId: debit.warehouseId, variationId: debit.variationId,
      } },
      select: { quantity: true },
    });
    await tx.inventoryTransaction.create({
      data: {
        storeId, warehouseId: debit.warehouseId,
        variationId: debit.variationId, type: "RETURN_IN", quantity,
        balanceAfter: stock.quantity, referenceType: "RETURN",
        referenceId: order.id, remarks: `Cancelled checkout order ${order.orderNo}`,
        createdBy: "checkout-cancel",
      },
    });
  }
}
// export async function createOrder(formData) {
//   const h = await headers();
//   const ip = getIP(h);

//   try {
//     const userId = await getUserId(); // Ensure user is authenticated, will throw if not
//     const formDataObj = Object.fromEntries(formData.entries());
//     const data = { ...formDataObj };
//     const orderItems = JSON.parse(data?.products);

//     if (!data?.customerName || !data?.phoneNumber || !data?.deliveryAddress) {
//       throw new Error(
//         "আপনার নাম, মোবাইল নাম্বার এবং ডেলিভারি ঠিকানা সঠিকভাবে লিখুন।",
//       );
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1️⃣ Get or create counter
//       let counter = await tx.orderCounter.findFirst();

//       if (!counter) {
//         counter = await tx.orderCounter.create({
//           data: { lastOrderNumber: 240000020 },
//         });
//       }

//       const newOrderNumber = counter.lastOrderNumber + 1;

//       await tx.orderCounter.update({
//         where: { id: counter.id },
//         data: { lastOrderNumber: newOrderNumber },
//       });

//       // 2️⃣ Create Order
//       const order = await tx.order.create({
//         data: {
//           orderNo: newOrderNumber.toString(),
//           userId: userId || null,
//           customerName: data.customerName,
//           phoneNumber: data.phoneNumber,
//           email: data.email,
//           city: data.district,
//           deliveryCharge: Number(data.deliveryCharge),
//           orderPrice: Number(data.orderPrice),
//           deliveryAddress: data.deliveryAddress,
//           paymentMethod: data.paymentMethod,
//           note: data?.note,
//           fbc: data?.fbc,
//           fbp: data?.fbp,
//           gclid: data?.gclid,
//           ttclid: data?.ttclid,

//           userAgent: data?.userAgent,
//           ipAddress: ip,
//         },
//       });

//       // 3️⃣ Create Order Items
//       for (let i = 0; i < orderItems.length; i++) {
//         const item = orderItems[i];

//         if (!item?.variation?.id) {
//           throw new Error(`Product "${item.title}" variation missing`);
//         }

//         // 🔻 Stock check
//         const variation = await tx.productVariation.findUnique({
//           where: { id: item.variation.id },
//           select: { stock: true },
//         });

//         if (variation.stock < item.quantity) {
//           throw new Error(
//             `${item.title} product stock not available. We have only ${variation.stock}.`,
//           );
//         }

//         // 🔻 Stock minus
//         await tx.productVariation.update({
//           where: { id: item.variation.id },
//           data: {
//             stock: {
//               decrement: Number(item.quantity),
//             },
//           },
//         });

//         // 4️⃣ Create OrderItem
//         await tx.orderItem.create({
//           data: {
//             orderNo: newOrderNumber.toString(),
//             orderItemNo: i + 1,
//             productName: item.title,
//             price: Number(item.discountPrice || item.regularPrice),
//             quantity: Number(item.quantity),
//             productCode: item.productCode,
//             sku: item.sku,
//             thumbnail: item.thumbnail,

//             product: {
//               connect: { id: item.id },
//             },
//             variation: {
//               connect: { id: item.variation.id },
//             },
//             order: {
//               connect: { id: order.id },
//             },
//             combination: item.variation.combinationId
//               ? { connect: { id: item.variation.combinationId } }
//               : undefined,

//             combinations: JSON.stringify(
//               item.variation.combinations?.map((c) => ({
//                 name: c.variationName.name,
//                 value: c.variationValue.value,
//               })) || [],
//             ),
//           },
//         });
//       }
//       await addOrderTimeline({
//         orderId: order.id,
//         orderNo: newOrderNumber.toString(),
//         status: "PENDING",
//         title: "Order Created",
//         message: "Your order has been created and is pending confirmation.",
//         createdBy: "user",
//       });
//       return order;
//     });

//     Promise.all([
//       // notifyNewOrder(result).catch((err) => console.error("SMS error:", err)),
//       revalidatePath("/admin/orders"),
//       revalidateTag("orders"),
//     ]);
//     return { success: true, data: result }; // Return success with order data
//   } catch (error) {
//     console.log(error.message);
//     return { success: false, error: error.message }; // Return structured error
//   }
// }

// A helper to dynamically create the 'select' object for Prisma
// This ensures we only fetch data that the table actually needs.

// export async function getAllOrder(params) {
//   try {
//     const {
//       limit = 10,
//       cursor,
//       tableProperties,
//       sortField = "createdAt",
//       sortDirection = "desc",
//       // ...other filters
//       orderNo,
//       sku,
//       phoneNumber,
//       status,
//       startDate,
//       endDate,
//     } = params;

//     const whereClause = {};
//     if (orderNo)
//       whereClause.orderNo = { contains: orderNo, mode: "insensitive" };
//     if (status) whereClause.status = status;
//     if (startDate && endDate) {
//       whereClause.createdAt = {
//         gte: new Date(startDate),
//         lte: new Date(endDate),
//       };
//     }
//     if (sku) {
//       whereClause.orderItems = {
//         some: { sku: { contains: sku, mode: "insensitive" } },
//       };
//     }
//     if (phoneNumber) {
//       whereClause.phoneNumber = { contains: phoneNumber, mode: "insensitive" };
//     }

//     const selectFields = getDataSelectFields(tableProperties);

//     const requestedLimit = Number(limit);
//     const items = await prisma.order.findMany({
//       take: requestedLimit + 1,
//       where: whereClause,
//       select: selectFields,
//       cursor: cursor ? { id: cursor } : undefined,
//       // The `skip: 1` is NECESSARY and CORRECT for Prisma's cursor implementation
//       // to exclude the cursor itself and start on the next record.
//       skip: cursor ? 1 : 0,
//       orderBy: { [sortField]: sortDirection },
//     });

//     let nextCursor = null;
//     // Check if we received more items than the requested page size.
//     if (items.length > requestedLimit) {
//       // --- THE CRITICAL FIX IS HERE ---
//       // 1. Remove the extra item that we fetched only to check for a next page.
//       items.pop();

//       // 2. The new cursor is the ID of the LAST item in the *remaining* array.
//       nextCursor = items[items.length - 1].id;
//     }

//     return {
//       success: true,
//       data: items,
//       nextCursor: nextCursor,
//     };
//   } catch (error) {
//     console.error("Failed to get orders:", error);
//     return { success: false, error: error.message };
//   }
// }
export async function createOrder(formData) {
  const [h, userId] = await Promise.all([headers(), getUserId()]);
  const ip = getIP(h);
  try {
    const storeId = await requireCurrentStoreId();
    const data = Object.fromEntries(formData.entries());
    const orderItems = JSON.parse(data?.products);
    const paymentMethod = String(data.paymentMethod || "").toUpperCase();
    if (
      !data?.customerName ||
      !data?.phoneNumber ||
      !data?.district ||
      !data?.thana ||
      !data?.deliveryAddress ||
      !Array.isArray(orderItems) ||
      !orderItems.length
    ) {
      throw new Error(
        "আপনার নাম, মোবাইল নাম্বার, জেলা, থানা এবং ডেলিভারি ঠিকানা সঠিকভাবে লিখুন।",
      );
    }
    if (!["COD", "ONLINE", "EMI"].includes(paymentMethod)) {
      throw new Error("Select a valid payment method.");
    }
    if (paymentMethod !== "COD" && !data.paymentGatewayId) {
      throw new Error("Select an online payment gateway.");
    }
    if (!/^01\d{9}$/.test(String(data.phoneNumber).trim()) ||
        !String(data.customerName).trim() ||
        !String(data.district).trim() ||
        !String(data.thana).trim() ||
        !String(data.deliveryAddress).trim() ||
        (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email).trim())) ||
        !["inside-dhaka", "outside-dhaka"].includes(data.deliveryArea)) {
      throw new Error("Enter a valid name, phone, address, email and delivery area.");
    }
    for (const item of orderItems) {
      const quantity = Number(item?.quantity);
      if (!/^[a-f\d]{24}$/i.test(String(item?.variation?.id || "")) ||
          !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) {
        throw new Error("Select a valid product variation and quantity (1–1000).");
      }
    }
    const variationIds = orderItems.map((item) => item.variation.id);
    const variations = await prisma.productVariation.findMany({
      where: { id: { in: variationIds }, product: { storeId, isActive: true, status: "ACTIVE" } },
      select: {
        id: true,
        sku: true,
        regularPrice: true,
        discountPrice: true,
        weight: true,
        combinations: {
          select: {
            id: true,
            variationName: { select: { name: true } },
            variationValue: { select: { value: true } },
          },
        },
        stocks: { where: { storeId }, select: { available: true } },
        product: {
          select: {
            id: true,
            title: true,
            productCode: true,
            allowOutOfStockOrder: true,
          },
        },
      },
    });
    const variationMap = Object.fromEntries(
      variations.map((v) => [
        v.id,
        {
          ...v,
          available: v.stocks.reduce(
            (sum, stock) => sum + Math.max(0, stock.available || 0),
            0,
          ),
        },
      ]),
    );
    const requestedByVariation = orderItems.reduce(
      (map, item) =>
        map.set(
          item.variation.id,
          (map.get(item.variation.id) || 0) + Number(item.quantity),
        ),
      new Map(),
    );
    for (const [variationId, requested] of requestedByVariation) {
      const variation = variationMap[variationId];
      if (!variation)
        throw new Error("Selected product variation was not found.");
      for (const item of orderItems.filter((row) => row.variation.id === variationId)) {
        if (item.id && item.id !== variation.product.id) {
          throw new Error("Selected variation does not belong to the product.");
        }
        if (item.variation.combinationId &&
            !variation.combinations.some((combination) => combination.id === item.variation.combinationId)) {
          throw new Error("Selected combination does not belong to the variation.");
        }
      }
      if (
        !variation.product?.allowOutOfStockOrder &&
        variation.available < requested
      ) {
        const item = orderItems.find((row) => row.variation.id === variationId);
        throw new Error(
          `${item.title} স্টক শেষ। মাত্র ${variation.available}টি বাকি আছে।`,
        );
      }
    }
    const serverOrderPrice = orderItems.reduce((total, item) => {
      const variation = variationMap[item.variation.id];
      const unitPrice = variation.discountPrice ?? variation.regularPrice;
      if (!Number.isFinite(Number(unitPrice)) || Number(unitPrice) <= 0)
        throw new Error(`Price is unavailable for ${variation.product.title}.`);
      return total + Number(item.quantity) * Number(unitPrice);
    }, 0);
    const serverOrderWeight = orderItems.reduce((total, item) => {
      const variation = variationMap[item.variation.id];
      return (
        total +
        Math.max(0, Number(variation.weight) || 0) * Number(item.quantity)
      );
    }, 0);
    const deliveryArea =
      data.deliveryArea === "inside-dhaka" ? "inside-dhaka" : "outside-dhaka";

    const result = await prisma.$transaction(async (tx) => {
      const deliveryRates = await getCheckoutDeliveryRates(tx);
      const deliveryCharge = calculateDeliveryCharge(
        deliveryArea,
        serverOrderWeight,
        deliveryRates,
      );
      const totalAmount = serverOrderPrice + deliveryCharge;
      const provider =
        paymentMethod !== "COD"
          ? await tx.paymentGateway.findUnique({
              where: { id: data.paymentGatewayId, storeId },
              include: { moneyAccount: true },
            })
          : null;
      const providerConfiguration = provider
        ? getProviderRuntimeConfiguration("gateway", provider)
        : null;
      if (paymentMethod !== "COD" && !providerConfiguration?.ready) {
        throw new Error(
          "The selected provider is unavailable or not fully configured.",
        );
      }
      if (paymentMethod === "EMI" && provider?.adapterKey !== "SSLCOMMERZ") {
        throw new Error(
          "Installment payment is available only through SSLCommerz.",
        );
      }
      if (paymentMethod === "COD") {
        const codGateway = await tx.paymentGateway.findFirst({
          where: { storeId, adapterKey: "COD", isActive: true },
        });
        if (!getProviderRuntimeConfiguration("gateway", codGateway).ready) {
          throw new Error("Cash on Delivery is currently disabled.");
        }
      }
      const counter = await tx.orderCounter.upsert({
        where: { storeId_idNo: { storeId, idNo: 11 } },
        update: { lastOrderNumber: { increment: 1 } },
        create: { storeId, idNo: 11, lastOrderNumber: 240000020 },
        select: { lastOrderNumber: true },
      });
      const newOrderNumber = counter.lastOrderNumber.toString();
      const order = await tx.order.create({
        data: {
          storeId,
          orderNo: newOrderNumber,
          userId: userId || null,
          customerName: data.customerName,
          phoneNumber: data.phoneNumber,
          email: data.email,
          city: data.district,
          thana: data.thana,
          deliveryArea,
          deliveryCharge,
          orderPrice: serverOrderPrice,
          orderWeight: serverOrderWeight,
          deliveryAddress: data.deliveryAddress,
          paymentMethod,
          paymentStatus: "PENDING",
          selectedPaymentGatewayId:
            paymentMethod !== "COD" ? provider.id : null,
          selectedCourierProviderId: null,
          paidAmount: 0,
          dueAmount: totalAmount,
          note: data?.note,
          fbc: data?.fbc,
          fbp: data?.fbp,
          gclid: data?.gclid,
          ttclid: data?.ttclid,
          userAgent: data?.userAgent,
          ipAddress: ip,
        },
      });
      // Checkout consumes sellable stock before the order can commit. The
      // conditional update is the concurrency guard; the earlier stock read
      // is only for a helpful validation message.
      const requiredStock = [...requestedByVariation].filter(
        ([variationId]) => !variationMap[variationId].product.allowOutOfStockOrder,
      );
      if (requiredStock.length) {
        const stockRows = await tx.stock.findMany({
          where: {
            storeId,
            variationId: { in: requiredStock.map(([variationId]) => variationId) },
            available: { gt: 0 },
          },
          orderBy: [{ warehouseId: "asc" }, { id: "asc" }],
        });
        // Delivery documents use one warehouse. Consume all required items
        // from one warehouse so later delivery can use the same allocation.
        const warehouseIds = [...new Set(stockRows.map((row) => row.warehouseId))];
        const warehouseId = warehouseIds.find((id) =>
          requiredStock.every(([variationId, quantity]) =>
            stockRows.some((row) =>
              row.warehouseId === id && row.variationId === variationId &&
              row.available >= quantity && row.quantity >= quantity,
            ),
          ),
        );
        if (!warehouseId) throw new Error("Requested stock is no longer available. Please refresh and try again.");
        for (const [variationId, quantity] of requiredStock) {
          const stock = stockRows.find((row) =>
            row.warehouseId === warehouseId && row.variationId === variationId,
          );
          const debited = await tx.stock.updateMany({
            where: {
              id: stock.id, storeId, warehouseId, variationId,
              available: { gte: quantity }, quantity: { gte: quantity },
            },
            data: {
              quantity: { decrement: quantity },
              available: { decrement: quantity },
              updatedBy: "checkout",
            },
          });
          if (debited.count !== 1) throw new Error("Requested stock changed. Please refresh and try again.");
          const updatedStock = await tx.stock.findUnique({
            where: { id: stock.id, storeId }, select: { quantity: true },
          });
          await tx.inventoryTransaction.create({
            data: {
              storeId, warehouseId, variationId, type: "OUT",
              quantity: -quantity, balanceAfter: updatedStock.quantity,
              referenceType: "SALE", referenceId: order.id,
              remarks: `Checkout stock for order ${order.orderNo}`,
              createdBy: "checkout",
            },
          });
        }
      }
      await tx.orderItem.createMany({
        data: orderItems.map((item, i) => {
          const variation = variationMap[item.variation.id];
          return {
            orderNo: newOrderNumber,
            orderItemNo: i + 1,
            productName: variation.product.title,
            price: Number(variation.discountPrice ?? variation.regularPrice),
            quantity: Number(item.quantity),
            productCode: variation.product.productCode,
            sku: variation.sku,
            thumbnail: item.thumbnail,
            productId: variation.product.id,
            variationId: variation.id,
            orderId: order.id,
            combinationId: item.variation.combinationId || undefined,
            combinations: JSON.stringify(variation.combinations.map((c) => ({
              name: c.variationName?.name,
              value: c.variationValue?.value,
            }))),
          };
        }),
      });
      const payment = await tx.payment.create({
        data: {
          storeId,
          orderId: order.id,
          gateway: paymentMethod !== "COD" ? provider.code : "COD",
          paymentMethod,
          paymentGatewayId: paymentMethod !== "COD" ? provider.id : null,
          courierProviderId: null,
          amount: totalAmount,
          status: "PENDING",
        },
      });
      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          orderNo: order.orderNo,
          status: "PENDING",
          title: "Order Created",
          message: "Your order has been created and is pending confirmation.",
          createdBy: "user",
        },
      });
      return {
        ...order,
        paymentId: payment.id,
        providerCode: paymentMethod !== "COD" ? provider.code : "COD",
      };
    });
    revalidatePath("/admin/orders");
    revalidateTag("orders");
    return { success: true, data: result };
  } catch (error) {
    const internalError = /^PrismaClient/.test(error?.name || "") ||
      /write conflict|transaction.*aborted/i.test(error?.message || "");
    return {
      success: false,
      error: internalError
        ? "Order could not be placed because stock changed. Please try again."
        : error.message,
    };
  }
}
export async function getAllOrder(params) {
  await requireProcurementPermission("order", "view");
  const storeId = await requireCurrentStoreId();
  return getListData({
    prisma,
    model: "order",
    params,
    searchableFields: [
      { field: "orderNo", type: "string", mode: "sensitive" },
      { field: "phoneNumber", type: "string", mode: "sensitive" },
      { field: "status", type: "enum" }, // ✅ ENUM safe
    ],
    relationSearch: {
      sku: {
        relation: "orderItems",
        field: "sku",
        type: "string",
        mode: "sensitive",
      },
    },
    dateField: "createdAt",
    baseWhere: { storeId },
  });
}

export async function getOrderCount(params) {
  await requireProcurementPermission("order", "view");
  const storeId = await requireCurrentStoreId();
  return getListCount({
    prisma,
    model: "order",
    params,
    searchableFields: [
      { field: "orderNo", type: "string", mode: "sensitive" },
      { field: "phoneNumber", type: "string", mode: "sensitive" },
      { field: "status", type: "enum" },
    ],
    relationSearch: {
      sku: {
        relation: "orderItems",
        field: "sku",
        type: "string",
        mode: "sensitive",
      },
    },
    dateField: "createdAt",
    baseWhere: { storeId },
  });
}

// export async function getOrderCount(params) {
//   try {
//     const { orderNo, sku, phoneNumber, status, startDate, endDate } = params;

//     const whereClause = {};
//     if (orderNo)
//       whereClause.orderNo = { contains: orderNo, mode: "insensitive" };
//     if (status) whereClause.status = status;
//     if (startDate && endDate) {
//       whereClause.createdAt = {
//         gte: new Date(startDate),
//         lte: new Date(endDate),
//       };
//     }
//     if (sku) {
//       whereClause.orderItems = {
//         some: { sku: { contains: sku, mode: "insensitive" } },
//       };
//     }
//     if (phoneNumber) {
//       whereClause.phoneNumber = { contains: phoneNumber, mode: "insensitive" };
//     }

//     const count = await prisma.order.count({
//       where: whereClause,
//     });

//     return { success: true, count };
//   } catch (error) {
//     console.error("Failed to get order count:", error);
//     return { success: false, error: error.message };
//   }
// }
export async function getOrderByOrderNo({ orderId, orderNo, phoneNumber }) {
  try {
    const storeId = await requireCurrentStoreId();
    if (!phoneNumber) throw new Error("Order phone number is required.");
    let finalOrderId = orderId;

    // orderId না থাকলে orderNo + phoneNumber দিয়ে Order খুঁজবে
    if (!finalOrderId) {
      if (!orderNo || !phoneNumber) {
        throw new Error(
          "Either orderId or both orderNo and phoneNumber are required",
        );
      }

      const order = await prisma.order.findFirst({
        where: {
          storeId,
          orderNo,
          phoneNumber,
        },
        select: {
          id: true,
        },
      });

      if (!order) {
        return {
          supersede: true,
          data: [],
        };
      }

      finalOrderId = order.id;
    }
    const data = await prisma.order.findUnique({
      where: { id: finalOrderId, storeId, phoneNumber },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });
    return { success: true, data }; // Return success with product data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getOrderById(orderId) {
  try {
    await requireProcurementPermission("order", "view");
    const storeId = await requireCurrentStoreId();
    const data = await prisma.order.findUnique({
      where: { id: orderId, storeId },

      include: {
        orderItems: {
          include: {
            variation: true,
            combination: true,
          },
        },
        shipping: { include: { courierProvider: true } },
        selectedPaymentGateway: true,
        selectedCourierProvider: true,
        payments: {
          include: {
            paymentGateway: true,
            courierProvider: true,
            moneyAccount: true,
          },
        },
      },
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getOrders({ userId, status, page = 1, limit = 10 }) {
  try {
    const currentUserId = await getUserId();
    if (!currentUserId || (userId && userId !== currentUserId)) throw new Error("Unauthorized order access.");
    const storeId = await requireCurrentStoreId();
    const skip = (page - 1) * limit;

    let where = { storeId, userId: currentUserId };

    if (status && status !== "all") {
      const dbStatuses = statusMap[status.toLowerCase()];
      if (dbStatuses && dbStatuses.length) {
        where.status = { in: dbStatuses };
      }
    }

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          orderItems: {
            include: { variation: true, combination: true },
          },
          shipping: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
export async function deleteOrderById(orderId) {
  try {
    await requireProcurementPermission("order", "delete");
    const storeId = await requireCurrentStoreId();
    await prisma.$transaction(async (tx) => {
      const [checkoutMovements, deliveries] = await Promise.all([
        tx.inventoryTransaction.count({ where: { storeId, referenceType: "SALE", referenceId: orderId, type: "OUT" } }),
        tx.delivery.count({ where: { storeId, orderId } }),
      ]);
      if (checkoutMovements || deliveries) throw new Error("Order with stock movement or delivery cannot be deleted. Use the controlled cancellation workflow.");
      await tx.order.delete({ where: { id: orderId, storeId } });
    });
    revalidatePath("/admin/order");
    revalidateTag("order");
    return {
      success: true,
      data: "Order and associated items deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting order:", error);
    return {
      success: false,
      message: error.message || "Failed to delete order",
    };
  }
}

export async function updateOrderStatusAction(orderId, status, note) {
  try {
    await requireProcurementPermission("order", "update");
    if (status === "REFUNDED") throw new Error("Complete the financial refund instead of changing the Order status directly.");
    if (status === "CANCELLED") {
      const cancelled = await cancelOrderById({ orderId, cancelReason: note, cancelReasonType: "Order Cancelled" });
      return cancelled.success ? { success: true, message: "Order Status Updated" } : cancelled;
    }
    const storeId = await requireCurrentStoreId();
    // 🔎 get order first (for orderNo + old status)
    const order = await prisma.order.findUnique({
      where: { id: orderId, storeId },
      select: {
        status: true,
        orderNo: true,
        id: true,
        paymentMethod: true,
        dueAmount: true,
        selectedCourierProviderId: true,
        shipping: {
          select: { cn: true, cod: true, courierProviderId: true },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Courier delivery is the COD collection event. The posting service is
    // idempotent, so webhook, status polling, and a repeated update cannot
    // credit the courier Money Account more than once.
    const postDeliveredCod = async () => {
      if (status !== "DELIVERED" || order.paymentMethod !== "COD") return null;
      const collectionAmount = Number(
        order.dueAmount ?? order.shipping?.cod ?? 0,
      );
      if (!Number.isFinite(collectionAmount) || collectionAmount <= 0) {
        return null;
      }
      return postCodCollection({
        orderId: order.id,
        courierProviderId:
          order.shipping?.courierProviderId ||
          order.selectedCourierProviderId ||
          undefined,
        amount: collectionAmount,
        reference: order.shipping?.cn || order.orderNo,
        externalEventId: `ORDER_DELIVERED:${order.id}`,
        collectedAt: new Date(),
        createdBy: "courier-delivery",
      });
    };

    // ❌ duplicate same status prevent
    if (order.status === status) {
      await postDeliveredCod();
      return {
        success: true,
        message: "Status already updated",
      };
    }

    // ✅ update order status
    await prisma.order.update({
      where: { id: orderId, storeId },
      data: {
        status,
      },
    });

    // 🧠 dynamic title বানানো
    const titleMap = {
      PENDING: "Order Placed",
      PROCESSING: " Order Comfirmed & Processing for Shipment",
      READY_TO_SHIP: "Ready to Ship",
      SHIPPED: "Order Shipped",
      DELIVERED: "Order Delivered",

      DELIVERY_FAILED: "Delivery Failed",
      FAILED_RETURNING: "Delivery Failed item Returning",
      FAILED_RETURN_RECEIVED: "Delivery Failed item Received",
      CANCELLED: "Order Cancelled",
      RETURNING: "Returning",
      RETURNED: "Returned",
      REFUNDING: "Refund Processing",
      REFUNDED: "Refund Completed",
    };

    // ✅ timeline add
    await addOrderTimeline({
      orderId: order.id,
      orderNo: order.orderNo,
      status,
      title: titleMap[status] || "Status Updated",
      message: note || `Order status changed to ${status}`,
      createdBy: "admin",
    });
    await postDeliveredCod();
    if (order.paymentMethod === "cod" && status === "PROCESSING") {
      firePurchaseServer({ orderId }).catch((err) =>
        console.error("Tracking failed:", err),
      );
    }

    // 🔄 revalidate
    revalidatePath("/admin/orders");
    revalidateTag("order");

    return {
      success: true,
      message: "Order Status Updated",
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: error.message || "Failed to Update order",
    };
  }
}
export async function updateOrderExtraDiscountAction({
  orderId,
  adminNote,
  adminDiscount,
}) {
  try {
    await requireProcurementPermission("order", "update");
    const storeId = await requireCurrentStoreId();
    if (!orderId) {
      throw new Error("Order ID is required");
    }
    const checkOrder = await prisma.order.findUnique({
      where: { id: orderId, storeId },
    });
    if (!checkOrder) {
      throw new Error("Order not found");
    }
    const result = await prisma.order.update({
      where: { id: orderId, storeId },
      data: {
        adminNote: adminNote,
        adminDiscount: Number(adminDiscount),
      },
    });

    return {
      success: true,
      message: "Order Status Updated",
    };
  } catch (error) {
    console.error("Error updating order:", error);
    return {
      success: false,
      message: error.message || "Failed to Update order",
    };
  }
}

export async function cancelOrderById({
  orderId,
  cancelReason,
  cancelReasonType,
}) {
  try {
    await requireProcurementPermission("order", "update");
    const storeId = await requireCurrentStoreId();
    await prisma.$transaction(async (tx) => {
      // 1️⃣ Order + items load
      const order = await tx.order.findUnique({
        where: { id: orderId, storeId },
        include: {
          orderItems: {
            select: {
              quantity: true,
              variationId: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // ❗ Already CANCELLED হলে আবার stock add করবে না
      if (order.status === "CANCELLED" || order.status === "RETURNED") {
        throw new Error("Order already CANCELLED/returned");
      }
      if (await tx.delivery.count({ where: { storeId, orderId } })) {
        throw new Error("An order with a prepared delivery requires the return workflow, not cancellation.");
      }

      await restoreCheckoutStock(tx, storeId, order);
      await tx.order.update({
        where: { id: orderId, storeId },
        data: {
          cancelReason: cancelReason || "",
          cancelReasonType: cancelReasonType || "",
          status: "CANCELLED",
        },
      });

      await tx.orderTimeline.create({
        data: {
          orderId, orderNo: order.orderNo, status: "CANCELLED",
          title: cancelReasonType || "Order Cancelled",
          message: cancelReason || "Order cancelled by administrator",
          createdBy: "system",
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error cancelling order:", error);
    return {
      success: false,
      message: error.message || "Failed to cancel order",
    };
  }
}

export async function processRefundAction({ orderId, trxId, note }) {
  try {
    // Keep legacy User RBAC. A present StoreMember never falls back to it.
    const createdBy = await requireProcurementPermission("order", "update");
    const storeId = await requireCurrentStoreId();
    if (!orderId) throw new Error("Order ID required.");
    const externalReference = `LEGACY_ORDER_REFUND:${orderId}`;
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId, storeId } });
      if (!order) throw new Error("Order not found.");
      const existing = await tx.refund.findFirst({
        where: { storeId, orderId, externalReference, status: "COMPLETED" },
        include: { moneyTransactions: { where: { storeId, type: "REFUND" }, select: { id: true } } },
      });
      if (existing?.moneyTransactions.length && order.status === "REFUNDED") {
        const [journal, ledger] = await Promise.all([
          tx.journalEntry.findFirst({
            where: { storeId, referenceType: "REFUND", referenceId: existing.id, status: "POSTED" },
            select: { id: true },
          }),
          tx.ledger.findFirst({
            where: { orderId, paymentId: existing.paymentId, type: "REFUND", reference: externalReference },
            select: { id: true },
          }),
        ]);
        if (journal && ledger) return { refund: existing, duplicate: true };
      }
      if (order.status === "REFUNDED") throw new Error("Order is already marked refunded without a matching financial posting.");
      if (!["RETURNED", "REFUNDING"].includes(order.status)) throw new Error("Refund not allowed in this status.");

      const payments = await tx.payment.findMany({
        where: { storeId, orderId, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
        select: { id: true, amount: true, moneyAccountId: true },
      });
      if (payments.length !== 1) {
        throw new Error("This refund requires exactly one posted payment. Use the per-payment financial refund workflow for multiple payments.");
      }
      if (!payments[0].moneyAccountId) throw new Error("The original payment has no money account.");
      // Preserve the prior merchandise-only amount; delivery charge is excluded.
      const targetAmount = Math.round((order.orderPrice - (order.adminDiscount || 0)) * 100) / 100;
      const previous = await tx.refund.findMany({
        where: { storeId, orderId, status: "COMPLETED" },
        include: { moneyTransactions: { where: { storeId, type: "REFUND" }, select: { id: true } } },
      });
      if (previous.some((refund) => !refund.moneyTransactions.length || refund.paymentId !== payments[0].id)) {
        throw new Error("Existing refund history needs review before completing another refund.");
      }
      const alreadyPosted = previous.reduce((sum, refund) => sum + refund.amount, 0);
      const amount = Math.round((targetAmount - alreadyPosted) * 100) / 100;
      if (amount <= 0 || amount > payments[0].amount - alreadyPosted + 0.001) {
        throw new Error("The merchandise refund amount exceeds the remaining posted payment.");
      }
      return postPaymentRefundInTransaction(tx, {
        storeId, orderId, paymentId: payments[0].id, amount,
        reason: "Returned merchandise refund",
        adminNote: [trxId && `External reference: ${String(trxId).trim()}`, note && String(note).trim()].filter(Boolean).join(" · ") || null,
        externalReference, createdBy, completeReturnedOrder: true,
      });
    }, { timeout: 30000 });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/accounts");
    return { success: true, message: result.duplicate ? "Refund was already completed." : "Refund completed successfully", data: result };
  } catch (error) {
    return { success: false, message: error.message || "Refund failed" };
  }
}

export async function getOrderCountsbyUserId(userId) {
  const currentUserId = await getUserId();
  if (!currentUserId || userId !== currentUserId) throw new Error("Unauthorized order access.");
  const storeId = await requireCurrentStoreId();
  const allOrders = await prisma.order.groupBy({
    by: ["status"],
    where: { storeId, userId },
    _count: { status: true },
  });

  const counts = {
    all: 0,
    running: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  };

  console.log("Grouped order counts:", allOrders);
  allOrders.forEach((o) => {
    counts.all += o._count.status;

    // Map Prisma enum to dashboard category
    if (
      ["PENDING", "PROCESSING", "READY_TO_SHIP", "SHIPPED"].includes(o.status)
    ) {
      counts.running += o._count.status;
    } else if (o.status === "DELIVERED") {
      counts.delivered += o._count.status;
    } else if (o.status === "CANCELLED") {
      counts.cancelled += o._count.status;
    } else if (["REFUNDING", "REFUNDED"].includes(o.status)) {
      counts.refunded += o._count.status;
    }
  });

  return counts;
}

export async function getOrderIdByOrderNoPhoneNo({ orderNo, phoneNumber }) {
  try {
    const storeId = await requireCurrentStoreId();
    if (!orderNo || !phoneNumber) {
      throw new Error(
        "Either orderId or both orderNo and phoneNumber are required",
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        storeId,
        orderNo,
        phoneNumber,
      },
      select: {
        id: true,
        orderNo: true,
        phoneNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        paidAmount: true,
        dueAmount: true,
      },
    });

    if (!order) {
      throw new Error("No order Found");
    }

    return { success: true, data: order }; // Return success with product data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function cancelUnpaidCustomerOrder({
  orderNo,
  phoneNumber,
  reason,
}) {
  try {
    const storeId = await requireCurrentStoreId();
    if (!orderNo || !phoneNumber)
      throw new Error("Order information is required.");
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { storeId, orderNo, phoneNumber },
        include: {
          shipping: true,
          payments: { select: { status: true } },
          deliveries: { select: { id: true }, take: 1 },
        },
      });
      if (!order) throw new Error("Order not found.");
      if (order.status === "CANCELLED") return;
      const hasPostedPayment = order.payments.some((payment) =>
        ["PAID", "PARTIALLY_PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(
          payment.status,
        ),
      );
      if (
        order.status !== "PENDING" ||
        (order.paidAmount || 0) > 0 ||
        hasPostedPayment ||
        order.shipping?.cn ||
        order.deliveries.length
      ) {
        throw new Error(
          "This order can no longer be cancelled by the customer.",
        );
      }
      await restoreCheckoutStock(tx, storeId, order);
      await tx.payment.updateMany({
        where: { storeId, orderId: order.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      await tx.order.update({
        where: { id: order.id, storeId },
        data: {
          status: "CANCELLED",
          paymentStatus: "CANCELLED",
          cancelReasonType: "CUSTOMER_CANCELLED",
          cancelReason: String(
            reason || "Cancelled by customer before confirmation",
          ).slice(0, 500),
        },
      });
      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          orderNo: order.orderNo,
          status: "CANCELLED",
          title: "Order Cancelled",
          message: String(
            reason || "Customer cancelled before order confirmation",
          ).slice(0, 500),
          createdBy: "customer",
        },
      });
    });
    revalidatePath("/admin/orders");
    revalidatePath("/tracking");
    return { success: true, message: "Order cancelled successfully." };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Order could not be cancelled.",
    };
  }
}
