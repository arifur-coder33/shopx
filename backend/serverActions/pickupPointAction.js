"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  actionError,
  requireProcurementPermission,
} from "../utils/procurement";

const refreshPickupPoints = () => {
  revalidatePath("/admin/settings/pickup-point");
  revalidatePath("/admin/orders");
};

const clean = (value) => String(value || "").trim();

async function validatedInput(values, currentId) {
  const courierProviderId = clean(values.courierProviderId);
  const storeId = clean(values.storeId);
  const name = clean(values.name);
  const address = clean(values.address);
  if (!courierProviderId || !storeId || !name || !address) {
    throw new Error("Courier, Store ID, store location, and contact address are required.");
  }
  const provider = await prisma.courierProvider.findUnique({
    where: { id: courierProviderId },
    select: { id: true, name: true, adapterKey: true },
  });
  if (!provider) throw new Error("Courier provider was not found.");
  if (provider.adapterKey === "PATHAO" && !/^\d+$/.test(storeId)) {
    throw new Error("Pathao Store ID must be numeric.");
  }
  const duplicate = await prisma.courierPickupPoint.findFirst({
    where: {
      courierProviderId,
      storeId,
      ...(currentId && { id: { not: currentId } }),
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new Error("This Store ID already exists for the selected courier.");
  }
  return {
    provider,
    data: {
      courierProviderId,
      courierName: provider.name,
      storeId,
      name,
      address,
      phoneNumber: clean(values.phoneNumber) || null,
      email: clean(values.email) || null,
    },
  };
}

export async function getPickupPointPageData(params = {}) {
  try {
    await requireProcurementPermission("provider", "view");
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(5, Number(params.limit) || 10));
    const courierProviderId = clean(params.courierProviderId);
    const where = {
      ...(clean(params.name) && {
        name: { contains: clean(params.name), mode: "insensitive" },
      }),
      ...(clean(params.storeId) && {
        storeId: { contains: clean(params.storeId), mode: "insensitive" },
      }),
      ...(courierProviderId && { courierProviderId }),
    };
    const [pickupPoints, total, providers] = await Promise.all([
      prisma.courierPickupPoint.findMany({
        where,
        include: {
          courierProvider: {
            select: { id: true, name: true, code: true, adapterKey: true },
          },
        },
        orderBy: [{ courierName: "asc" }, { name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.courierPickupPoint.count({ where }),
      prisma.courierProvider.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          code: true,
          adapterKey: true,
          isActive: true,
        },
      }),
    ]);
    return {
      success: true,
      data: { pickupPoints, providers },
      filters: params,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  } catch (error) {
    return actionError(error, "Failed to load pickup points.");
  }
}

export async function createPickupPoint(formData) {
  try {
    await requireProcurementPermission("provider", "create");
    const values = Object.fromEntries(formData.entries());
    const input = await validatedInput(values);
    const pickupPoint = await prisma.courierPickupPoint.create({
      data: input.data,
    });
    refreshPickupPoints();
    return {
      success: true,
      message: `${input.provider.name} pickup point created.`,
      data: pickupPoint,
    };
  } catch (error) {
    return actionError(error, "Failed to create pickup point.");
  }
}

export async function updatePickupPoint(formData) {
  try {
    await requireProcurementPermission("provider", "update");
    const values = Object.fromEntries(formData.entries());
    const id = clean(values.id);
    if (!id) throw new Error("Pickup point ID is required.");
    const existing = await prisma.courierPickupPoint.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new Error("Pickup point was not found.");
    const input = await validatedInput(values, id);
    const pickupPoint = await prisma.courierPickupPoint.update({
      where: { id },
      data: input.data,
    });
    refreshPickupPoints();
    return {
      success: true,
      message: "Pickup point updated.",
      data: pickupPoint,
    };
  } catch (error) {
    return actionError(error, "Failed to update pickup point.");
  }
}

export async function deletePickupPoint(id) {
  try {
    await requireProcurementPermission("provider", "delete");
    const pickupPoint = await prisma.courierPickupPoint.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!pickupPoint) throw new Error("Pickup point was not found.");
    // Shipping stores provider/CN snapshots and has no pickup-point relation,
    // therefore this record has no dependent document and can be removed safely.
    await prisma.courierPickupPoint.delete({ where: { id } });
    refreshPickupPoints();
    return { success: true, message: "Pickup point deleted." };
  } catch (error) {
    return actionError(error, "Failed to delete pickup point.");
  }
}
