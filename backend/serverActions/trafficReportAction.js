"use server";

import { requireProcurementPermission } from "@/backend/utils/procurement";
import { loadGa4TrafficReport } from "@/backend/services/ga4ReportingService";

export async function getTrafficReport(range) {
  try {
    await requireProcurementPermission("socialTracking", "view");
    const allowed = ["today", "7daysAgo", "28daysAgo", "90daysAgo"];
    return { success: true, data: await loadGa4TrafficReport(allowed.includes(range) ? range : "7daysAgo") };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Traffic report could not be loaded.",
    };
  }
}
