import "server-only";
import prisma from "@/lib/prisma";
import { isDatabaseId } from "@/lib/databaseId";

function normalizePhone(value) {
  let phone = String(value || "").replace(/\D/g, "").slice(0, 13);
  if (/^8801[3-9]\d{8}$/.test(phone)) phone = `0${phone.slice(2)}`;
  return /^01[3-9]\d{8}$/.test(phone) ? phone : null;
}

const cleanText = (value, maxLength = 300) => typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export async function saveAbandonedCheckoutLead(input = {}) {
  const phoneNumber = normalizePhone(input.phoneNumber);
  if (!phoneNumber) return { success: false, message: "Valid phone number required." };

  const items = Array.isArray(input.items)
    ? input.items.slice(0, 20).map((item) => ({
        name: cleanText(item?.name, 120),
        quantity: Math.max(1, Math.min(99, Number(item?.quantity) || 1)),
        price: item?.price != null && Number.isFinite(Number(item.price)) && Number(item.price) >= 0 ? Number(item.price) : null,
        productUrl: /^\/product\/[a-zA-Z0-9_-]+$/.test(String(item?.productUrl || "")) ? item.productUrl : null,
      })).filter((item) => item.name)
    : [];
  const now = new Date();
  const lastError = cleanText(input.checkoutError, 500);
  const data = {
    customerName: cleanText(input.customerName, 120) || null,
    district: cleanText(input.district, 100) || null,
    thana: cleanText(input.thana, 100) || null,
    deliveryAddress: cleanText(input.deliveryAddress, 300) || null,
    email: cleanText(input.email, 160) || null,
    note: cleanText(input.note, 300) || null,
    deliveryArea: ["inside-dhaka", "outside-dhaka"].includes(input.deliveryArea) ? input.deliveryArea : null,
    items,
    lastSeenAt: now,
    ...(lastError && { lastError, lastErrorAt: now }),
  };

  await prisma.abandonedCheckoutLead.upsert({
    where: { phoneNumber },
    update: data,
    create: { phoneNumber, ...data, createdAt: now },
  });
  return { success: true };
}

export async function listAbandonedCheckoutLeads(limit = 250) {
  return prisma.abandonedCheckoutLead.findMany({
    orderBy: { updatedAt: "desc" },
    take: Math.min(500, Math.max(1, Number(limit) || 250)),
    select: {
      id: true, phoneNumber: true, customerName: true, district: true, thana: true,
      deliveryAddress: true, email: true, note: true, deliveryArea: true, items: true,
      createdAt: true, updatedAt: true, lastSeenAt: true,
      lastError: true, lastErrorAt: true,
    },
  });
}

export async function deleteAbandonedCheckoutLead(id) {
  if (!isDatabaseId(String(id || ""))) return false;
  const result = await prisma.abandonedCheckoutLead.deleteMany({ where: { id } });
  return result.count > 0;
}

export async function deleteAbandonedCheckoutLeadByPhone(phoneValue) {
  try {
    const phoneNumber = normalizePhone(phoneValue);
    if (!phoneNumber) return;
    await prisma.abandonedCheckoutLead.deleteMany({ where: { phoneNumber } });
  } catch {
    // Order creation must succeed even if abandoned-lead cleanup is temporarily unavailable.
  }
}
