"use server";

import prisma from "@/lib/prisma";

export async function fetchCursorData({
  model,
  where = {},
  select = {},
  cursor,
  take = 5,
}) {
  if (!model) throw new Error("Prisma model is required");

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
