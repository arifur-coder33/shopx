"use server";
import { getDataSelectFields } from "./getDataSelectFields";

export async function getListData({
  prisma,
  model,
  params,
  searchableFields = [],
  relationSearch = {},
  dateField = "createdAt",
}) {
  const {
    limit = 10,
    cursor,
    tableProperties,
    sortField = dateField,
    sortDirection = "desc",
    startDate,
    endDate,
    ...filters
  } = params;

  const where = {};

  // 🔹 Normal searchable fields
  searchableFields.forEach(({ field, type = "string", exactMatch = false }) => {
    const value = filters[field];
    if (!value || value === "ALL") return;

    if (type === "enum" || exactMatch) {
      where[field] = value; // exact match
    } else {
      where[field] = { contains: value, mode: "insensitive" }; // default insensitive
    }
  });

  // 🔹 Relation search
  Object.entries(relationSearch).forEach(([key, config]) => {
    const value = filters[key];
    if (!value || value === "ALL") return;

    if (config.relationType === "single") {
      where[config.relation] = {
        is: config.exactMatch
          ? { [config.field]: value } // exact match
          : { [config.field]: { contains: value, mode: "insensitive" } }, // default insensitive
      };
      return;
    }

    // multi-relation
    where[config.relation] = {
      some: config.exactMatch
        ? { [config.field]: value }
        : { [config.field]: { contains: value, mode: "insensitive" } },
    };
  });

  // 🔹 Date range
  if (startDate && endDate) {
    where[dateField] = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const select = getDataSelectFields(tableProperties);
  const take = Number(limit);
  // sortField fallback check
  let finalSortField = "id";

  if (sortField && select?.[sortField]) {
    finalSortField = sortField;
  } else if (select?.[dateField]) {
    finalSortField = dateField;
  }

  const orderBy = [
    { [finalSortField]: sortDirection === "asc" ? "asc" : "desc" },
  ];

  const cursorObj = cursor ? { id: cursor } : undefined;

  const items = await prisma[model].findMany({
    take: take + 1,
    where,
    select,
    orderBy,
    cursor: cursorObj,
    skip: cursorObj ? 1 : 0,
  });

  let nextCursor = null;
  if (items.length > take) {
    items.pop();
    nextCursor = items[items.length - 1].id;
  }

  return { success: true, data: items, nextCursor };
}
