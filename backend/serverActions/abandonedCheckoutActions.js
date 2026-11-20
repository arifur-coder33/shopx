"use server";

import { hasPermission } from "@/backend/utils/hasPermission";
import prisma from "@/lib/prisma";
import { getStorefrontProductBySlug } from "@/backend/services/storefrontProductService";
import { createOrder, updateOrderExtraDiscountAction, updateOrderStatusAction } from "@/backend/serverActions/orderActions";
import { createCourierDeliveryAction } from "@/backend/serverActions/courierAction";
import { revalidatePath } from "next/cache";
import { getCheckoutDeliveryRates } from "@/backend/services/deliveryChargeService";
import { calculateDeliveryCharge } from "@/lib/deliveryCharge";
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

export async function getAbandonedCheckoutOrderFormAction(id) {
  try {
    await hasPermission("order", "update");
    const lead = await prisma.abandonedCheckoutLead.findUnique({ where: { id } });
    if (!lead) return { success: false, message: "Checkout lead পাওয়া যায়নি।" };
    const items = await Promise.all((Array.isArray(lead.items) ? lead.items : []).map(async (item, index) => {
      const match = String(item.productUrl || "").match(/^\/product\/([a-zA-Z0-9_-]+)$/);
      if (!match) return { index, name: item.name, quantity: item.quantity, unavailable: true, message: "পণ্যের লিংক পাওয়া যায়নি" };
      const result = await getStorefrontProductBySlug(match[1]);
      if (!result.success) return { index, name: item.name, quantity: item.quantity, unavailable: true, message: "পণ্যটি আর পাওয়া যাচ্ছে না" };
      const product = result.data;
      const variations = product.variations.map((variation) => ({
        id: variation.id,
        sku: variation.sku,
        weight: Number(variation.weight) || 0,
        regularPrice: Number(variation.regularPrice) || 0,
        discountPrice: Number(variation.discountPrice) || 0,
        stock: Number(variation.stock) || 0,
        label: variation.combinations.map(({ variationName, variationValue }) => `${variationName.name}: ${variationValue.value}`).join(" · ") || variation.sku,
      }));
      const savedPrice = Number(item.price);
      const preferred = variations.find((variation) => variation.id === item.variationId)
        || variations.find((variation) => variation.discountPrice === savedPrice || variation.regularPrice === savedPrice);
      return {
        index, productId: product.id, slug: product.slug, name: product.title,
        quantity: item.quantity, thumbnail: product.thumbnail?.name || null,
        variations, variationId: preferred?.id || variations[0]?.id || "",
        bundleSelections: item.bundleSelections && typeof item.bundleSelections === "object" ? item.bundleSelections : {},
        bundleOptions: product.bundleOptions || [],
        unavailable: !variations.length,
      };
    }));
    return {
      success: true,
      data: {
        id: lead.id,
        customerName: lead.customerName || "",
        phoneNumber: lead.phoneNumber,
        email: lead.email || "",
        district: lead.district || "",
        thana: lead.thana || "",
        deliveryAddress: lead.deliveryAddress || "",
        note: lead.note || "",
        deliveryArea: lead.deliveryArea || "outside-dhaka",
        deliveryRates: await getCheckoutDeliveryRates(),
        items,
      },
    };
  } catch (error) {
    return { success: false, message: error.message || "Order form খোলা যায়নি।" };
  }
}

export async function getAbandonedCheckoutProductForOrderAction(slug) {
  try {
    await hasPermission("order", "update");
    const safeSlug = String(slug || "").trim();
    if (!/^[a-zA-Z0-9_-]{1,180}$/.test(safeSlug)) return { success: false, message: "পণ্যটি পাওয়া যায়নি।" };
    const result = await getStorefrontProductBySlug(safeSlug);
    if (!result.success) return { success: false, message: "পণ্যটি পাওয়া যায়নি।" };
    const product = result.data;
    const variations = (product.variations || []).map((variation) => ({
      id: variation.id,
      sku: variation.sku,
      weight: Number(variation.weight) || 0,
      regularPrice: Number(variation.regularPrice) || 0,
      discountPrice: Number(variation.discountPrice) || 0,
      label: variation.combinations.map(({ variationName, variationValue }) => `${variationName.name}: ${variationValue.value}`).join(" · ") || variation.sku,
    }));
    if (!variations.length) return { success: false, message: "এই পণ্যের বিক্রয়যোগ্য variation নেই।" };
    return { success: true, data: { index: `added-${product.id}`, productId: product.id, slug: product.slug, name: product.title, quantity: 1, thumbnail: product.thumbnail?.name || null, variations, variationId: variations[0].id, bundleSelections: {}, bundleOptions: product.bundleOptions || [], unavailable: false } };
  } catch (error) {
    return { success: false, message: error.message || "পণ্যটি যোগ করা যায়নি।" };
  }
}

export async function createAbandonedCheckoutOrderAction(input) {
  try {
    await hasPermission("order", "update");
    const lead = await prisma.abandonedCheckoutLead.findUnique({ where: { id: String(input?.leadId || "") } });
    if (!lead) throw new Error("Checkout lead পাওয়া যায়নি বা ইতিমধ্যে order হয়েছে।");
    const leadItems = Array.isArray(lead.items) ? lead.items : [];
    const requestedItems = Array.isArray(input?.items) ? input.items : [];
    if (!requestedItems.length) throw new Error("কমপক্ষে একটি valid product রাখতে হবে।");
    const products = [];
    for (const item of requestedItems) {
      const source = Number.isInteger(Number(item.sourceIndex)) && item.sourceIndex !== null ? leadItems[Number(item.sourceIndex)] : null;
      const slug = source
        ? String(source.productUrl || "").match(/^\/product\/([a-zA-Z0-9_-]+)$/)?.[1]
        : String(item.productSlug || "").trim();
      if (!slug) throw new Error(`${source?.name || "পণ্য"}-এর product link পাওয়া যায়নি।`);
      const variation = await prisma.productVariation.findFirst({
        where: { id: String(item.variationId || ""), product: { slug, isActive: true } },
        select: { id: true, productId: true, sku: true, product: { select: { title: true } } },
      });
      if (!variation) throw new Error(`${source?.name || slug}-এর নির্বাচিত variation আর পাওয়া যাচ্ছে না।`);
      const quantity = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || Number(source?.quantity) || 1)));
      products.push({
        title: variation.product.title,
        slug,
        productId: variation.productId,
        quantity,
        variation: { id: variation.id, combinations: [] },
        bundleSelections: item.bundleSelections && typeof item.bundleSelections === "object" ? item.bundleSelections : undefined,
      });
    }

    const form = new FormData();
    form.set("customerName", String(input.customerName || lead.customerName || "").trim());
    form.set("phoneNumber", String(input.phoneNumber || lead.phoneNumber).trim());
    form.set("email", String(input.email || "").trim());
    form.set("deliveryAddress", String(input.deliveryAddress || "").trim());
    form.set("district", String(input.district || "").trim());
    form.set("thana", String(input.thana || "").trim());
    form.set("note", String(input.note || "").trim());
    form.set("deliveryArea", input.deliveryArea === "inside-dhaka" ? "inside-dhaka" : "outside-dhaka");
    form.set("paymentMethod", "COD");
    form.set("paymentPlan", "FULL");
    form.set("products", JSON.stringify(products));
    form.set("fbc", lead.fbc || "");
    form.set("fbp", lead.fbp || "");
    form.set("gaClientId", lead.gaClientId || "");
    form.set("gclid", lead.gclid || "");
    form.set("gbraid", lead.gbraid || "");
    form.set("wbraid", lead.wbraid || "");
    form.set("ttclid", lead.ttclid || "");
    form.set("orderSource", "ABANDONED_CHECKOUT");
    form.set("marketingAttribution", JSON.stringify(lead.marketingAttribution || {}));

    const created = await createOrder(form);
    if (!created?.success || !created.data?.id) throw new Error(created?.error || "Order তৈরি করা যায়নি।");

    const extraDiscount = Number(input.extraDiscount) || 0;
    if (extraDiscount > 0) {
      const discounted = await updateOrderExtraDiscountAction({ orderId: created.data.id, adminDiscount: extraDiscount, adminNote: "Created from abandoned checkout" });
      if (!discounted.success) throw new Error(`Order #${created.data.orderNo} তৈরি হয়েছে, কিন্তু discount প্রয়োগ হয়নি: ${discounted.message}`);
    }

    let courierWarning = null;
    if (input.courier?.courierProviderId) {
      const order = await prisma.order.findUnique({
        where: { id: created.data.id },
        select: { orderNo: true, customerName: true, phoneNumber: true, deliveryAddress: true, city: true, thana: true, dueAmount: true, orderWeight: true, note: true },
      });
      const courierForm = new FormData();
      courierForm.set("courierProviderId", input.courier.courierProviderId);
      courierForm.set("pickupPointId", input.courier.pickupPointId || "");
      courierForm.set("invoice", order.orderNo);
      courierForm.set("name", order.customerName);
      courierForm.set("phone", order.phoneNumber);
      courierForm.set("address", [order.deliveryAddress, order.thana, order.city].filter(Boolean).join(", "));
      courierForm.set("city", order.city || "");
      courierForm.set("price", String(order.dueAmount || 0));
      courierForm.set("weight", String(order.orderWeight || 0.5));
      courierForm.set("note", String(input.courier.note || order.note || "").slice(0, 480));
      if (input.courier.manualEntry) {
        courierForm.set("manualEntry", "true");
        courierForm.set("cn", String(input.courier.cn || ""));
      }
      const booked = await createCourierDeliveryAction({ formData: courierForm });
      if (!booked.success) courierWarning = booked.message || "Courier order তৈরি হয়নি।";
    }

    if (courierWarning || !input.courier?.courierProviderId) {
      const confirmed = await updateOrderStatusAction(created.data.id, "PROCESSING");
      if (!confirmed.success) throw new Error(`Order #${created.data.orderNo} তৈরি হয়েছে, কিন্তু Processing করা যায়নি: ${confirmed.message}`);
    }
    revalidatePath("/admin/orders");
    revalidatePath("/admin/abandoned-checkouts");
    return { success: true, data: { orderNo: created.data.orderNo, orderId: created.data.id, courierWarning } };
  } catch (error) {
    return { success: false, message: error.message || "Abandoned checkout থেকে order তৈরি করা যায়নি।" };
  }
}
