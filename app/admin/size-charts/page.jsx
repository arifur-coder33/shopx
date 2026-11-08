import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sizeVariationFilter } from "@/backend/services/sizeChartService";
import SizeChartManager from "./SizeChartManager";

export default async function SizeChartsPage() {
  const permissions = (await auth())?.user?.permissions || [];
  const can = (action) => permissions.includes("*") || permissions.includes(`variation:${action}`);
  if (!can("view")) return <p>Unauthorized</p>;
  const [charts, values, categories] = await Promise.all([
    prisma.sizeChart.findMany({ include: { image: true }, orderBy: { name: "asc" } }),
    prisma.variationValue.findMany({ where: { variation: sizeVariationFilter }, select: { value: true }, distinct: ["value"], orderBy: { value: "asc" } }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, fullPath: true, parentCategoryId: true, sizeChartId: true,
        variations: { where: { variation: sizeVariationFilter }, take: 1, select: { id: true } } },
    }),
  ]);
  const byId = new Map(categories.map((category) => [category.id, category]));
  const supportsSize = (category) => {
    const visited = new Set();
    while (category && !visited.has(category.id)) {
      if (category.sizeChartId || category.variations.length) return true;
      visited.add(category.id);
      category = byId.get(category.parentCategoryId);
    }
    return false;
  };
  return <SizeChartManager
    charts={charts}
    options={values}
    categories={categories.map((category) => ({
      id: category.id,
      sizeChartId: category.sizeChartId,
      label: category.parentCategoryId ? category.fullPath || category.name : category.name,
      canAssign: supportsSize(category),
    }))}
    canCreate={can("create")}
    canEdit={can("update")}
    canDelete={can("delete")}
    canAssign={can("update") && (permissions.includes("*") || permissions.includes("category:update"))}
  />;
}
