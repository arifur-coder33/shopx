"use server";
import { getListData } from "@/backend/utils/getListData";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { generateCode } from "../utils/generateCode";
import { getListCount } from "../utils/getListCount";
import { requireCurrentStoreId } from "../services/storeContextService";
export async function getAllSuppliers(params) {
  const storeId = await requireCurrentStoreId();
  return getListData({
    prisma,
    model: "supplier",
    params,
    searchableFields: [
      { field: "supplierCode", type: "string", mode: "sensitive" },
      { field: "companyName", type: "string", mode: "sensitive" },
      { field: "phone", type: "string", mode: "sensitive" },
      { field: "isActive", type: "boolean", exactMatch: true },
    ],
    // relationSearch: {
    //   sku: {
    //     relation: "orderItems",
    //     field: "sku",
    //     type: "string",
    //     mode: "sensitive",
    //   },
    // },
    dateField: "createdAt",
    baseWhere: { storeId },
  });
}

export async function getSupplierCount(params) {
  const storeId = await requireCurrentStoreId();
  return getListCount({
    prisma,
    model: "supplier",
    params,
    searchableFields: [
      { field: "supplierCode", type: "string", mode: "sensitive" },
      { field: "companyName", type: "string", mode: "sensitive" },
      { field: "phone", type: "string", mode: "sensitive" },
      { field: "isActive", type: "boolean", exactMatch: true },
    ],
    // relationSearch: {
    //   sku: {
    //     relation: "orderItems",
    //     field: "sku",
    //     type: "string",
    //     mode: "sensitive",
    //   },
    // },
    dateField: "createdAt",
    baseWhere: { storeId },
  });
}

export async function getSupplierById(id) {
  try {
    const storeId = await requireCurrentStoreId();
    const supplier = await prisma.supplier.findUnique({
      where: { id, storeId },
      include: {
        documents: {
          include: {
            media: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!supplier) {
      return {
        success: false,
        message: "Supplier not found.",
      };
    }
    // Transform documents
    const transformedGallery = supplier?.documents?.map((g) => ({
      id: g.media.id,
      name: g.media.name,
    }));

    const data = {
      ...supplier,
      documents: transformedGallery,
    };

    return { success: true, data: data };
  } catch (error) {
    console.error("Error fetching supplier by ID:", error);
    throw new Error("Failed to fetch supplier");
  }
}

export async function createSupplier(formData) {
  try {
    const storeId = await requireCurrentStoreId();
    const data = Object.fromEntries(formData.entries());

    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        storeId,
        OR: [{ companyName: data.companyName }],
      },
    });

    if (existingSupplier) {
      return {
        success: false,
        message:
          "A supplier with the same supplier number or company name already exists.",
      };
    }

    const supplierCode = await generateCode(prisma, {
      name: "SUPPLIER",
      prefix: "11",
      padding: 4,
    });

    const newSupplierData = {
      companyName: data.companyName,
      contactName: data.contactName,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      country: data.country,
      tradeLicense: data.tradeLicense,
      tin: data.tin,
      bin: data.bin,
      notes: data.notes,
      supplierCode: supplierCode,
      isActive: data.isActive === "on" || data.isActive === true,
      openingBalance: data.openingBalance ? parseFloat(data.openingBalance) : 0,
    };

    const documentIds = data?.documents
      ? data.documents
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id)
      : [];
    const documentCount = documentIds.length
      ? await prisma.media.count({ where: { storeId, id: { in: documentIds } } })
      : 0;
    if (documentCount !== documentIds.length) {
      throw new Error("A selected supplier document belongs to another Store.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const newSupplier = await tx.supplier.create({
        data: {
          storeId,
          ...newSupplierData,
        },
      });

      if (documentIds.length > 0) {
        await tx.supplierDocument.createMany({
          data: documentIds.map((documentId) => ({
            supplierId: newSupplier.id,
            mediaId: documentId,
          })),
        });
      }
      return newSupplier;
    });
    revalidatePath("/admin/suppliers");
    return {
      success: true,
      message: "Supplier created successfully.",
      data: result,
    };
  } catch (error) {
    console.error("Error creating supplier:", error);
    return {
      success: false,
      message: "Failed to create supplier.",
    };
  }
}

export async function updateSupplier({ id, formData }) {
  try {
    const storeId = await requireCurrentStoreId();
    const data = Object.fromEntries(formData.entries());
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id, storeId },
    });
    if (!existingSupplier) {
      return {
        success: false,
        message: "Supplier not found.",
      };
    }

    const newSupplierData = {
      companyName: data.companyName,
      contactName: data.contactName,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      country: data.country,
      tradeLicense: data.tradeLicense,
      tin: data.tin,
      bin: data.bin,
      notes: data.notes,
      isActive: data.isActive === "on" || data.isActive === true,
      openingBalance: data.openingBalance ? parseFloat(data.openingBalance) : 0,
    };
    const updatedSupplier = await prisma.supplier.update({
      where: { id, storeId },
      data: {
        ...newSupplierData,
      },
    });

    revalidatePath("/admin/suppliers");

    return {
      success: true,
      message: "Supplier updated successfully.",
      data: updatedSupplier,
    };
  } catch (error) {
    console.error("Error updating supplier:", error);
    return {
      success: false,
      message: "Failed to update supplier.",
    };
  }
}

export async function deleteSupplier(id) {
  try {
    const storeId = await requireCurrentStoreId();
    const purchaseCount = await prisma.purchaseOrder.count({
      where: { storeId, supplierId: id },
    });
    if (purchaseCount > 0) {
      return {
        success: false,
        message: "Supplier has purchase orders and cannot be deleted.",
      };
    }
    await prisma.supplier.delete({ where: { id, storeId } });
    revalidatePath("/admin/suppliers");
    return { success: true, message: "Supplier deleted successfully." };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
