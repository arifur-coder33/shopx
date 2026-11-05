"use server";

import prisma from "@/lib/prisma";
import { normalizeEmiSettings } from "@/lib/emi.mjs";
import { requireProcurementPermission, actionError } from "@/backend/utils/procurement";
import { revalidatePath, revalidateTag } from "next/cache";

export async function getProviderEmiSettings(providerId) {
  try {
    await requireProcurementPermission("provider", "view");
    const provider = await prisma.paymentGateway.findUnique({ where: { id: providerId }, select: { adapterKey: true, emiConfiguration: { include: { plans: { orderBy: [{ bankName: "asc" }, { tenureMonths: "asc" }] } } } } });
    if (provider?.adapterKey !== "SSLCOMMERZ") throw new Error("EMI settings are available only for SSLCommerz.");
    return { success: true, data: provider.emiConfiguration || { enabled: false, minimumAmount: 0, plans: [] } };
  } catch (error) { return actionError(error, "Could not load EMI settings."); }
}

export async function saveProviderEmiSettings(providerId, input) {
  try {
    const userId = await requireProcurementPermission("provider", "update");
    const { plans, ...settings } = normalizeEmiSettings(input);
    await prisma.$transaction(async (tx) => {
      const provider = await tx.paymentGateway.findUnique({ where: { id: providerId }, select: { adapterKey: true } });
      if (provider?.adapterKey !== "SSLCOMMERZ") throw new Error("EMI settings are available only for SSLCommerz.");
      const configuration = await tx.emiConfiguration.upsert({ where: { paymentGatewayId: providerId }, create: { paymentGatewayId: providerId, ...settings, updatedBy: userId }, update: { ...settings, updatedBy: userId } });
      await tx.emiBankPlan.deleteMany({ where: { emiConfigurationId: configuration.id } });
      if (plans.length) await tx.emiBankPlan.createMany({ data: plans.map((plan) => ({ ...plan, emiConfigurationId: configuration.id })) });
    });
    revalidateTag("checkout-providers");
    revalidatePath("/admin/settings/payment-gateways");
    revalidatePath("/product/[slug]", "page");
    revalidatePath("/buynow/[slug]", "page");
    revalidatePath("/checkout");
    return { success: true, message: "EMI settings saved." };
  } catch (error) { return actionError(error, "Could not save EMI settings."); }
}
