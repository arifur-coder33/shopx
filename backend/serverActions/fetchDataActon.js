"use server";

import prisma from "@/lib/prisma";
import { requireCurrentStoreId } from "../services/storeContextService";

const SUPPORTED_MODELS = new Set(["user", "order"]);

async function trustedWhere(model, where) {
  if (!SUPPORTED_MODELS.has(model)) throw new Error("Unsupported data model");
  if (model !== "order") return where;
  const storeId = await requireCurrentStoreId();
  return { ...where, storeId };
}

export async function fetchCursorData({
  model,
  where = {},
  select = {},
  cursor,
  take = 5,
}) {
  if (!model) throw new Error("Prisma model is required");
  where = await trustedWhere(model, where);

  const queryOptions = {
    where,
    select,
    take: take + 1,
    orderBy: { createdAt: "desc" },
  };

  if (cursor) {
    queryOptions.cursor = { id: cursor };
    queryOptions.skip = 1; // skip the cursor itself
  }

  const [data, total] = await Promise.all([
    prisma[model].findMany(queryOptions),
    prisma[model].count({ where }),
  ]);

  const nextCursor = data.length === take + 1 ? data[data.length - 1].id : null;

  return {
    success: true,
    data,
    pagination: { total, take, nextCursor },
  };
}
export async function fetchPageData({
  model,
  where = {},
  select = {},
  page = 1,
  take = 10,
}) {
  where = await trustedWhere(model, where);
  const skip = (page - 1) * take;

  const [data, total] = await Promise.all([
    prisma[model].findMany({
      where,
      select,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma[model].count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  return {
    success: true,
    data,
    pagination: { total, take, page, totalPages },
  };
}

export async function fetchSingleData({ model, where = {}, select = {} }) {
  if (!model) throw new Error("Prisma model is required");

  try {
    where = await trustedWhere(model, where);
    const data = await prisma[model].findFirst({
      where,
      select,
    });

    if (!data) {
      return { success: false, data: null, error: "Record not found" };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, data: null, error: error.message };
  }
}

/// usegaes

//  const fatchData = await fetchSingleData({
//     model: "order",
//     where: { id: orderId, userId },
//     select: {
//       id: true,
//       createdAt: true,
//       status: true,
//       orderNo: true,
//       orderPrice: true,
//       deliveryCharge: true,
//       deliveryAddress: true,
//       adminDiscount: true,
//       customerName: true,
//       phoneNumber: true,
//       email: true,
//       paymentMethod: true,
//       paymentStatus: true,
//       dueAmount: true,
//       paidAmount: true,
//       orderItems: {
//         select: {
//           id: true,
//           productName: true,
//           quantity: true,
//           price: true,
//           sku: true,
//           thumbnail: true,
//         },
//       },
//     },
//   });
