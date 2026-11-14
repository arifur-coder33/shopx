"use server";

import prisma from "@/lib/prisma";
import { hasPermission } from "@/backend/utils/hasPermission";
import { getCategorySizeSettings, sizeVariationFilter } from "@/backend/services/sizeChartService";
import { revalidatePath } from "next/cache";
import { revalidateSizeChartProducts } from "@/backend/utils/revalidateCategoryProducts";

export async function getSizeChartOptions(parentId) {
  await hasPermission("category", "view");
  const [charts, settings] = await Promise.all([
    prisma.sizeChart.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getCategorySizeSettings(parentId),
  ]);
  return { charts, supportsSize: settings.supportsSize, inheritedName: settings.chart?.name };
}

export async function addChartSize(input) {
  try {
    await hasPermission("variation", "create");
    const value = String(input || "").trim();
    if (!value || value.length > 50) throw new Error("Enter a size of 1 to 50 characters.");
    await prisma.$transaction(async (tx) => {
      const size = await tx.variationName.findFirst({ where: sizeVariationFilter, orderBy: { name: "asc" } });
      if (!size) throw new Error("Create the Size variation first.");
      const existing = await tx.variationValue.findFirst({ where: { variationId: size.id, value } });
      if (!existing) await tx.variationValue.create({ data: { variationId: size.id, value } });
    });
    revalidatePath("/admin/size-charts");
    return { value };
  } catch (error) {
    return { error: error.message };
  }
}

export async function saveSizeChart(id, formData) {
  try {
    await hasPermission("variation", id ? "update" : "create");
    const name = String(formData.get("name") || "").trim();
    const imageId = String(formData.get("imageId") || "");
    const unit = formData.get("unit");
    const { sizes, rows } = JSON.parse(formData.get("table"));
    if (!name || name.length > 120 || !imageId || !["mm", "cm", "inch"].includes(unit)) {
      throw new Error("Enter a name, choose a photo and select a unit.");
    }
    if (!Array.isArray(sizes) || !sizes.length || sizes.length > 40 || new Set(sizes).size !== sizes.length ||
        !Array.isArray(rows) || !rows.length || rows.length > 40 || !rows.some((row) => row.kind === "measurement")) {
      throw new Error("Select sizes and add at least one measurement row.");
    }
    if (rows.filter((row) => row.kind === "recommendation").length > 1) {
      throw new Error("Keep only one recommendation row.");
    }
    const options = await prisma.variationValue.findMany({
      where: { variation: sizeVariationFilter, value: { in: sizes } },
      select: { value: true },
    });
    const allowed = new Set(options.map(({ value }) => value));
    if (sizes.some((size) => !allowed.has(size))) throw new Error("Choose valid Size variation values.");
    const normalized = rows.map((row) => {
      const name = String(row.name || "").trim();
      const kind = row.kind;
      if (!name || name.length > 100 || !["measurement", "recommendation"].includes(kind)) throw new Error("Name every row.");
      const cells = Object.fromEntries(sizes.map((size) => {
        const cell = row.cells?.[size];
        const isRange = kind === "recommendation";
        const values = typeof cell !== "string" ? [] : isRange ? cell.split(/[-–—]/) : [cell];
        const field = `${isRange ? "Recommended for" : "Measurement"} ${name}, size ${size}`;
        if (values.length !== (isRange ? 2 : 1) ||
            values.some((value) => !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0)) {
          throw new Error(isRange
            ? `${field}: enter a range such as 31-32.`
            : `${field}: enter a non-negative number.`);
        }
        const numbers = values.map(Number);
        if (isRange && numbers[0] > numbers[1]) {
          throw new Error(`${field}: "${cell}" must start with the smaller number.`);
        }
        return [size, numbers];
      }));
      return { name, kind, cells };
    });
    const recommendation = normalized.find((row) => row.kind === "recommendation");
    const measurements = normalized.filter((row) => row.kind === "measurement");
    const data = { name, imageId, unit, sizes, rows: recommendation ? [recommendation, ...measurements] : measurements };
    if (id) await prisma.sizeChart.update({ where: { id }, data });
    else await prisma.sizeChart.create({ data });
    revalidatePath("/admin/size-charts");
    if (id) await revalidateSizeChartProducts({ chartId: id });
    return { success: true };
  } catch (error) {
    return { error: error.code === "P2002" ? "A chart with this name already exists." : error.message };
  }
}

export async function changeSizeChartCategory(chartId, categoryId, assign) {
  try {
    await hasPermission("variation", "update");
    await hasPermission("category", "update");
    await prisma.$transaction(async (tx) => {
      const chart = await tx.sizeChart.findUnique({ where: { id: chartId }, select: { id: true } });
      if (!chart) throw new Error("Size chart not found.");
      if (assign && !(await getCategorySizeSettings(categoryId, tx)).supportsSize) {
        throw new Error("The category must support the Size variation.");
      }
      const changed = await tx.category.updateMany({
        where: { id: categoryId, sizeChartId: assign ? null : chartId },
        data: { sizeChartId: assign ? chartId : null },
      });
      if (!changed.count) throw new Error("This category assignment changed. Refresh and try again.");
    }, { isolationLevel: "Serializable" });
    revalidatePath("/admin/size-charts");
    revalidatePath("/admin/categories");
    await revalidateSizeChartProducts({ categoryId });
    return { success: true };
  } catch (error) {
    return { error: error.code === "P2034" ? "This category assignment changed. Refresh and try again." : error.message };
  }
}

export async function deleteSizeChart(id) {
  try {
    await hasPermission("variation", "delete");
    await prisma.sizeChart.delete({ where: { id } });
    revalidatePath("/admin/size-charts");
    return { success: true };
  } catch (error) {
    return { error: error.code === "P2003" ? "Remove the category assignments before deleting this chart." : error.message };
  }
}
