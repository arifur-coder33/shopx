"use server";
import prisma from "@/lib/prisma";
import { actionError, refreshProcurement, requireProcurementPermission } from "../utils/procurement";

export async function createWarehouse(formData) {
  try {
    const userId = await requireProcurementPermission("warehouse", "create");
    const values = Object.fromEntries(formData.entries());
    if (!values.code?.trim() || !values.name?.trim()) return { success: false, message: "Warehouse code and name are required." };
    const result = await prisma.$transaction(async (tx) => {
      const isDefault = values.isDefault === "on";
      if (isDefault) await tx.warehouse.updateMany({ data: { isDefault: false } });
      return tx.warehouse.create({ data: { code: values.code.trim().toUpperCase(), name: values.name.trim(), address: values.address || null, phone: values.phone || null, manager: values.manager || null, isDefault, createdBy: userId, updatedBy: userId } });
    });
    refreshProcurement();
    return { success: true, message: "Warehouse created successfully.", data: result };
  } catch (error) { return actionError(error, "Failed to create warehouse."); }
}
