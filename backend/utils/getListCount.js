"use server";

export async function getListCount({
  prisma,
  model,
  params,
  searchableFields = [],
  relationSearch = {},
  dateField = "createdAt",
}) {
  const { startDate, endDate, ...filters } = params;
  const where = {};

  searchableFields.forEach(({ field, type = "string", exactMatch = false }) => {
    const value = filters[field];
    if (!value || value === "ALL") return;

    if (type === "boolean") {
      where[field] = value === true || value === "true";
    } else if (type === "enum" || exactMatch) {
      where[field] = value;
    } else {
      where[field] = { contains: value, mode: "insensitive" };
    }
  });

  Object.entries(relationSearch).forEach(([key, config]) => {
    const value = filters[key];
    if (!value || value === "ALL") return;

    if (config.relationType === "single") {
      where[config.relation] = {
        is: config.exactMatch
          ? { [config.field]: value }
          : { [config.field]: { contains: value, mode: "insensitive" } },
      };
      return;
    }

    where[config.relation] = {
      some: config.exactMatch
        ? { [config.field]: value }
        : { [config.field]: { contains: value, mode: "insensitive" } },
    };
  });

  if (startDate && endDate) {
    where[dateField] = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const count = await prisma[model].count({ where });
  return { success: true, count };
}
