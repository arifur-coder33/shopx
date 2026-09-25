import prisma from "@/lib/prisma";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";

export async function getCampaignEditorOptions(extraProductIds = [], extraCategoryIds = []) {
  const [firstProducts, firstCategories, selectedProducts, selectedCategories, gateways] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, select: { id: true, title: true, thumbnail: { select: { name: true } }, variations: { select: { regularPrice: true, discountPrice: true } } }, orderBy: { title: "asc" }, take: 10 }),
    prisma.category.findMany({ select: { id: true, name: true, parentCategory: { select: { name: true } } }, orderBy: { name: "asc" }, take: 10 }),
    extraProductIds.length ? prisma.product.findMany({ where: { id: { in: extraProductIds } }, select: { id: true, title: true, thumbnail: { select: { name: true } }, variations: { select: { regularPrice: true, discountPrice: true } } } }) : [],
    extraCategoryIds.length ? prisma.category.findMany({ where: { id: { in: extraCategoryIds } }, select: { id: true, name: true, parentCategory: { select: { name: true } } } }) : [],
    prisma.paymentGateway.findMany({ where: { isActive: true }, include: { moneyAccount: { select: { id: true, isActive: true } } }, orderBy: { sortOrder: "asc" } }),
  ]);
  const products = [...new Map([...firstProducts, ...selectedProducts].map((product) => [product.id, product])).values()];
  const categories = [...new Map([...firstCategories, ...selectedCategories].map((category) => [category.id, category])).values()];
  const paymentGateways = gateways.filter((gateway) => getProviderRuntimeConfiguration("gateway", gateway).ready).map(({ code, name, adapterKey }) => ({ code, name, adapterKey }));
  return { products, categories, paymentGateways };
}
