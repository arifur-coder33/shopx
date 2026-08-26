"use server";
import { getListData } from "@/backend/utils/getListData";
import prisma from "@/lib/prisma";

import { generateCode } from "../utils/generateCode";
import { getListCount } from "../utils/getListCount";
export async function getAllSuppliers(params) {
  return getListData({
    prisma,
    model: "supplier",
    params,
    searchableFields: [
      { field: "supplierNo", type: "string", mode: "sensitive" },
      { field: "companyName", type: "string", mode: "sensitive" },
      { field: "phoneNumber", type: "string", mode: "sensitive" },
      { field: "status", type: "enum" }, // ✅ ENUM safe
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
  });
}

export async function getSupplierCount(params) {
  return getListCount({
    prisma,
    model: "supplier",
    params,
    searchableFields: [
      { field: "supplierNo", type: "string", mode: "sensitive" },
      { field: "companyName", type: "string", mode: "sensitive" },
      { field: "phoneNumber", type: "string", mode: "sensitive" },
      { field: "status", type: "enum" }, // ✅ ENUM safe
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
  });
}

export async function getSupplierById(id) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
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
    const data = Object.fromEntries(formData.entries());

    const existingSupplier = await prisma.supplier.findFirst({
      where: {
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
      phoneNumber: data.phoneNumber,
      email: data.email,
      address: data.address,
      city: data.city,
      state: data.state,
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

    const result = await prisma.$transaction(async (tx) => {
      const newSupplier = await tx.supplier.create({
        data: {
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
    const data = Object.fromEntries(formData.entries());
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
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
      phoneNumber: data.phoneNumber,
      email: data.email,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      tradeLicense: data.tradeLicense,
      tin: data.tin,
      bin: data.bin,
      notes: data.notes,
      supplierCode: supplierCode,
      isActive: data.isActive === "on" || data.isActive === true,
    };
    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...newSupplierData,
      },
    });

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
