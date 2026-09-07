"use server";

import { postPaymentRefund } from "@/backend/services/paymentPostingService";
import { requireProcurementPermission } from "@/backend/utils/procurement";
import { revalidatePath } from "next/cache";

export async function refundPayment(input) {
  const userId = await requireProcurementPermission("order", "update");
  const result = await postPaymentRefund({ ...input, createdBy: userId });
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/orders");
  return result;
}
