"use server";

import { hasPermission } from "@/backend/utils/hasPermission";
import {
  deleteAbandonedCheckoutLead,
  listAbandonedCheckoutLeads,
  saveAbandonedCheckoutLead,
} from "@/backend/services/abandonedCheckoutService";

export async function saveAbandonedCheckoutLeadAction(input) {
  try {
    return await saveAbandonedCheckoutLead(input);
  } catch {
    return { success: false, message: "Checkout details could not be saved." };
  }
}

export async function getAbandonedCheckoutLeadsAction() {
  await hasPermission("order", "view");
  return listAbandonedCheckoutLeads();
}

export async function deleteAbandonedCheckoutLeadAction(id) {
  await hasPermission("order", "update");
  try {
    return { success: await deleteAbandonedCheckoutLead(id) };
  } catch {
    return { success: false };
  }
}