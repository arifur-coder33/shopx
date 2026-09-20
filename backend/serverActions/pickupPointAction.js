"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  actionError,
  requireProcurementPermission,
} from "../utils/procurement";
import { requireCurrentStoreId } from "../services/storeContextService";

const refreshPickupPoints = () => {
  revalidatePath("/admin/settings/pickup-point");
  revalidatePath("/admin/orders");
};

const clean = (value) => String(value || "").trim();

async function validatedInput(values, storeId, currentId) {
  const courierProviderId = clean(values.courierProviderId);
  const externalStoreId = clean(values.storeId);
  const name = clean(values.name);
  const address = clean(values.address);
  if (!courierProviderId || !externalStoreId || !name || !address) {
    throw new Error("Courier, Store ID, store location, and contact address are required.");
  }
  const provider = await prisma.courierProvider.findUnique({
    where: { id: courierProviderId, storeId },
    select: { id: true, name: true, adapterKey: true },
  });
  if (!provider) throw new Error("Courier provider was not found.");
  if (provider.adapterKey === "PATHAO" && !/^\d+$/.test(externalStoreId)) {
    throw new Error("Pathao Store ID must be numeric.");
  }
  const duplicate = await prisma.courierPickupPoint.findFirst({
    where: {
      courierProviderId,
      storeId,
      externalStoreId,
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
      externalStoreId,
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
    const storeId = await requireCurrentStoreId();
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(5, Number(params.limit) || 10));
    const courierProviderId = clean(params.courierProviderId);
    const where = {
      storeId,
      ...(clean(params.name) && {
        name: { contains: clean(params.name), mode: "insensitive" },
      }),
      ...(clean(params.storeId) && {
        externalStoreId: { contains: clean(params.storeId), mode: "insensitive" },
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
        where: { storeId },
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
      data: {
        pickupPoints: pickupPoints.map((point) => ({
          ...point,
          storeId: point.externalStoreId,
          externalStoreId: undefined,
        })),
        providers,
      },
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
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const input = await validatedInput(values, storeId);
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
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const id = clean(values.id);
    if (!id) throw new Error("Pickup point ID is required.");
    const existing = await prisma.courierPickupPoint.findUnique({
      where: { id, storeId },
      select: { id: true },
    });
    if (!existing) throw new Error("Pickup point was not found.");
    const input = await validatedInput(values, storeId, id);
    const pickupPoint = await prisma.courierPickupPoint.update({
      where: { id, storeId },
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
    const storeId = await requireCurrentStoreId();
    const pickupPoint = await prisma.courierPickupPoint.findUnique({
      where: { id, storeId },
      select: { id: true },
    });
    if (!pickupPoint) throw new Error("Pickup point was not found.");
    // Shipping stores provider/CN snapshots and has no pickup-point relation,
    // therefore this record has no dependent document and can be removed safely.
    await prisma.courierPickupPoint.delete({ where: { id, storeId } });
    refreshPickupPoints();
    return { success: true, message: "Pickup point deleted." };
  } catch (error) {
    return actionError(error, "Failed to delete pickup point.");
  }
}
