"use server";

import prisma from "@/lib/prisma";
import { hasPermission, getUserId } from "../utils/hasPermission";
import { revalidatePath, revalidateTag } from "next/cache";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import { isDatabaseId } from "@/lib/databaseId";

const TYPES = new Set(["PRODUCT_DISCOUNT", "CART_DISCOUNT", "DELIVERY_DISCOUNT", "DELIVERY", "PAYMENT_DISCOUNT", "COUPON", "COMBO"]);
const STATUSES = new Set(["DRAFT", "PUBLISHED", "PAUSED", "EXPIRED"]);
const DISCOUNT_TYPES = new Set(["PERCENT", "FIXED"]);

const resultError = (error) => ({
  success: false,
  message: error?.code === "P2002" ? "A campaign with this value already exists." : error?.message || "Unable to save campaign.",
});

function parseIds(value) {
  const parsed = JSON.parse(String(value || "[]"));
  if (!Array.isArray(parsed)) throw new Error("Invalid campaign targets.");
  return [...new Set(parsed.map(String).filter(isDatabaseId))];
}

function parseProductPairs(value) {
  const parsed = JSON.parse(String(value || "[]"));
  if (!Array.isArray(parsed)) throw new Error("Invalid combo rules.");
  return parsed.map((pair) => {
    const rewardProductIds = Array.isArray(pair?.rewardProductIds) && pair.rewardProductIds.length ? [...new Set(pair.rewardProductIds.map(String))] : (pair?.rewardProductId ? [String(pair.rewardProductId)] : []);
    return {
      triggerType: String(pair?.triggerType || "PRODUCT").toUpperCase(),
      requiredProductIds: Array.isArray(pair?.requiredProductIds) ? pair.requiredProductIds.map(String) : (pair?.requiredProductId ? [String(pair.requiredProductId)] : []),
      requiredCategoryIds: Array.isArray(pair?.requiredCategoryIds) ? pair.requiredCategoryIds.map(String) : (pair?.requiredCategoryId ? [String(pair.requiredCategoryId)] : []),
      rewardProductIds,
      rewardProductId: rewardProductIds[0] || "",
    };
  });
}

function dateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error("Enter a valid campaign date.");
  return date;
}

function campaignData(formData, userId) {
  const type = String(formData.get("group") || formData.get("type") || "PRODUCT_DISCOUNT").toUpperCase();
  const status = String(formData.get("status") || "DRAFT").toUpperCase();
  const name = String(formData.get("name") || "").trim().replace(/\s+/g, " ");
  const startAt = dateOrNull(formData.get("startAt"));
  const endAt = dateOrNull(formData.get("endAt"));
  if (!name || name.length > 160) throw new Error("Campaign name is required (maximum 160 characters).");
  if (!TYPES.has(type) || !STATUSES.has(status)) throw new Error("Invalid campaign type or status.");
  if (startAt && endAt && endAt <= startAt) throw new Error("End date must be after the start date.");
  const discountType = String(formData.get("discountType") || "PERCENT").toUpperCase();
  const discountValue = Number(formData.get("discountValue"));
  if (!DISCOUNT_TYPES.has(discountType) || !Number.isFinite(discountValue) || discountValue < 0 || (discountType === "PERCENT" && discountValue > 100)) {
    throw new Error("Enter a valid discount value.");
  }
  const minimumOrderAmount = Number(formData.get("minimumOrderAmount"));
  const priority = Number.parseInt(formData.get("priority"), 10);
  return {
    name,
    description: String(formData.get("description") || "").trim() || null,
    group: type,
    type,
    status,
    bannerUrl: String(formData.get("bannerUrl") || "").trim() || null,
    startAt,
    endAt,
    discountType,
    discountValue,
    specialPrice: String(formData.get("specialPrice") ?? "").trim() !== "" && Number.isFinite(Number(formData.get("specialPrice"))) && Number(formData.get("specialPrice")) >= 0 ? Number(formData.get("specialPrice")) : null,
    maxDiscountAmount: String(formData.get("maxDiscountAmount") ?? "").trim() !== "" && Number.isFinite(Number(formData.get("maxDiscountAmount"))) && Number(formData.get("maxDiscountAmount")) > 0 ? Number(formData.get("maxDiscountAmount")) : null,
    minimumQuantity: Number.isFinite(Number(formData.get("minimumQuantity"))) && Number(formData.get("minimumQuantity")) > 0 ? Number(formData.get("minimumQuantity")) : null,
    stackable: formData.get("stackable") === "on" && formData.get("exclusive") !== "on",
    exclusive: formData.get("exclusive") === "on",
    discountBase: String(formData.get("discountBase") || "ELIGIBLE_SUBTOTAL").trim().toUpperCase(),
    deliveryZone: String(formData.get("deliveryZone") || "").trim() || null,
    shippingMethod: String(formData.get("shippingMethod") || "").trim() || null,
    terms: String(formData.get("terms") || "").trim() || null,
    cashbackType: String(formData.get("cashbackType") || "").trim().toUpperCase() || null,
    configuration: {
      offerType: String(formData.get("offerType") || "").trim().toUpperCase() || null,
      paymentScope: String(formData.get("paymentScope") || "ALL").trim().toUpperCase(),
      paymentDiscountTarget: String(formData.get("paymentDiscountTarget") || "ORDER").trim().toUpperCase(),
      couponType: String(formData.get("couponType") || "").trim().toUpperCase() || null,
      comboType: String(formData.get("comboType") || "").trim().toUpperCase() || null,
      productPairs: parseProductPairs(formData.get("productPairs")),
      rewardProductIds: parseIds(formData.get("rewardProductIds")),
      requiredQuantity: Number(formData.get("requiredQuantity")) > 0 ? Number(formData.get("requiredQuantity")) : null,
      rewardQuantity: Number(formData.get("rewardQuantity")) > 0 ? Number(formData.get("rewardQuantity")) : null,
      rewardDiscountPercent: Number(formData.get("rewardDiscountPercent")) >= 0 ? Number(formData.get("rewardDiscountPercent")) : null,
      firstOrderOnly: formData.get("firstOrderOnly") === "on",
    },
    minimumOrderAmount: Number.isFinite(minimumOrderAmount) && minimumOrderAmount >= 0 ? minimumOrderAmount : null,
    paymentMethod: null,
    paymentMethods: [],
    couponCode: type === "COUPON" ? String(formData.get("couponCode") || "").trim().toUpperCase() || null : null,
    usageLimit: Number.isFinite(Number(formData.get("usageLimit"))) && Number(formData.get("usageLimit")) > 0 ? Number(formData.get("usageLimit")) : null,
    perCustomerLimit: Number.isFinite(Number(formData.get("perCustomerLimit"))) && Number(formData.get("perCustomerLimit")) > 0 ? Number(formData.get("perCustomerLimit")) : null,
    priority: Number.isFinite(priority) ? priority : 0,
    updatedBy: userId || null,
  };
}

export async function getCampaigns({ page = 1, query = "" } = {}) {
  try {
    await hasPermission("campaign", "view");
    const safePage = Math.max(1, Number(page) || 1);
    const search = String(query || "").trim().slice(0, 100);
    const where = search ? { name: { contains: search, mode: "insensitive" } } : {};
    const [data, total] = await Promise.all([
      prisma.campaign.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (safePage - 1) * 20, take: 20, include: { _count: { select: { products: true, categories: true, usages: true } } } }),
      prisma.campaign.count({ where }),
    ]);
    return { success: true, data, total, page: safePage };
  } catch (error) { return resultError(error); }
}

// Search the catalog only when an admin asks for more target options.
export async function searchCampaignTargets(kind, query) {
  try {
    await hasPermission("campaign", "view");
    const search = String(query || "").trim().slice(0, 100);
    if (search.length < 2) return { success: true, data: [] };
    if (kind === "product") {
      const data = await prisma.product.findMany({
        where: { isActive: true, OR: [{ title: { contains: search, mode: "insensitive" } }, { slug: { contains: search, mode: "insensitive" } }] },
        select: { id: true, title: true, thumbnail: { select: { name: true } }, variations: { select: { regularPrice: true, discountPrice: true } } },
        orderBy: [{ title: "asc" }, { id: "asc" }],
        take: 20,
      });
      return { success: true, data };
    }
    if (kind === "category") {
      const data = await prisma.category.findMany({
        where: { OR: [{ name: { contains: search, mode: "insensitive" } }, { parentCategory: { is: { name: { contains: search, mode: "insensitive" } } } }] },
        select: { id: true, name: true, parentCategory: { select: { name: true } } },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: 20,
      });
      return { success: true, data };
    }
    throw new Error("Invalid campaign target search.");
  } catch (error) {
    return resultError(error);
  }
}

export async function saveCampaign(formData) {
  try {
    const id = String(formData.get("id") || "");
    await hasPermission("campaign", id ? "update" : "create");
    const userId = await getUserId();
    const data = campaignData(formData, userId);
    const rawPaymentMethods = JSON.parse(String(formData.get("paymentMethods") || "[]"));
    if (!Array.isArray(rawPaymentMethods) || rawPaymentMethods.some((code) => typeof code !== "string")) throw new Error("Choose valid payment methods.");
    const submittedMethods = [...new Set(rawPaymentMethods.map((code) => code.trim().toUpperCase()).filter(Boolean))];
    const paymentScope = data.group === "PAYMENT_DISCOUNT" ? data.configuration.paymentScope : null;
    if (data.group === "PAYMENT_DISCOUNT" && !["ALL", "COD", "ONLINE"].includes(paymentScope)) throw new Error("Choose all payment methods, COD, or online payment.");
    if (data.group === "PAYMENT_DISCOUNT" && !["ORDER", "DELIVERY"].includes(data.configuration.paymentDiscountTarget)) throw new Error("Choose whether the payment discount applies to the order or delivery charge.");
    if (data.group === "PAYMENT_DISCOUNT" && data.configuration.paymentDiscountTarget === "DELIVERY" && !["PERCENT", "FIXED"].includes(data.configuration.offerType)) throw new Error("Delivery payment discounts must be percentage or fixed amount discounts.");
    if (data.group === "DELIVERY_DISCOUNT" && data.configuration.offerType === "ONLINE_PAYMENT") throw new Error("Create online-payment delivery discounts under Payment Discount and select Delivery charge.");
    const specificOnline = formData.get("onlineMethodScope") === "SPECIFIC";
    if (data.group === "PAYMENT_DISCOUNT" && paymentScope !== "ONLINE" && submittedMethods.length) throw new Error("Specific payment methods can only be selected for online payment.");
    if (data.group === "PAYMENT_DISCOUNT" && paymentScope === "ONLINE" && specificOnline && !submittedMethods.length) throw new Error("Select at least one online payment method.");
    if (data.group === "PAYMENT_DISCOUNT" && submittedMethods.includes("COD")) throw new Error("COD is selected using the COD payment scope.");
    const methodsToValidate = data.group === "PAYMENT_DISCOUNT"
      ? paymentScope === "ONLINE" && specificOnline ? submittedMethods : []
      : submittedMethods;
    const validGateways = await prisma.paymentGateway.findMany({ where: { code: { in: methodsToValidate }, isActive: true }, include: { moneyAccount: { select: { id: true, isActive: true } } } });
    const readyCodes = new Set(validGateways.filter((gateway) => getProviderRuntimeConfiguration("gateway", gateway).ready).map((gateway) => gateway.code));
    if (methodsToValidate.some((code) => !readyCodes.has(code))) throw new Error("Only enabled and fully configured online payment methods can be selected.");
    const selectedPaymentMethods = data.group === "PAYMENT_DISCOUNT"
      ? paymentScope === "COD" ? ["COD"] : paymentScope === "ONLINE" && specificOnline ? methodsToValidate : []
      : submittedMethods;
    data.paymentMethods = selectedPaymentMethods;
    const bannerMediaId = String(formData.get("bannerMedia") || "").split(",")[0];
    if (bannerMediaId) {
      if (!isDatabaseId(bannerMediaId)) throw new Error("Select a valid campaign banner.");
      const media = await prisma.media.findUnique({ where: { id: bannerMediaId }, select: { name: true } });
      if (!media) throw new Error("The selected campaign banner was not found.");
      data.bannerUrl = media.name;
    } else if (id) {
      // Keep the existing banner when an edit does not replace it.
      const existing = await prisma.campaign.findUnique({ where: { id }, select: { bannerUrl: true } });
      data.bannerUrl = existing?.bannerUrl || null;
    }
    const productIds = parseIds(formData.get("productIds"));
    const categoryIds = parseIds(formData.get("categoryIds"));
    const targetScope = String(formData.get("targetScope") || "ALL").toUpperCase();
    if (!["ALL", "CATEGORY", "PRODUCT"].includes(targetScope)) throw new Error("Choose a valid campaign target scope.");
    if (targetScope === "CATEGORY" && (!categoryIds.length || productIds.length)) throw new Error("Choose one or more categories only.");
    if (targetScope === "PRODUCT" && (!productIds.length || categoryIds.length)) throw new Error("Choose one or more products only.");
    if (targetScope === "ALL" && (productIds.length || categoryIds.length)) throw new Error("All products scope cannot include specific targets.");
    if (data.type === "COUPON" && !data.couponCode) throw new Error("Coupon campaigns need a coupon code.");
    if (data.type === "COMBO") {
      const comboType = data.configuration.comboType;
      if (!["BUNDLE_FIXED", "BUNDLE_PERCENT", "BUY_X_GET_Y", "BUY_X_GET_Y_DISCOUNT", "QUANTITY"].includes(comboType)) throw new Error("Choose a valid combo offer type.");
      if (!data.configuration.requiredQuantity || !data.configuration.rewardQuantity) throw new Error("Set both the qualifying quantity and reward quantity.");
      if (comboType === "BUNDLE_FIXED" && data.discountType !== "FIXED") throw new Error("A fixed-price bundle must use a fixed price.");
      if (comboType === "BUNDLE_PERCENT" && data.discountType !== "PERCENT") throw new Error("A percentage bundle must use percentage discount.");
      if (comboType === "BUY_X_GET_Y_DISCOUNT" && (!(data.configuration.rewardDiscountPercent > 0) || data.configuration.rewardDiscountPercent > 100)) throw new Error("Set a reward discount between 0 and 100 percent.");
      if (comboType === "BUY_X_GET_Y" && (data.discountType !== "PERCENT" || data.discountValue !== 100)) throw new Error("A free reward must use 100 percent discount.");
    }
    if (data.type === "COMBO" && !data.configuration.productPairs.length) throw new Error("Add at least one complete buy/get product pair.");
    if (data.type === "COMBO" && data.configuration.productPairs.some((pair) => {
      const rewards = pair.rewardProductIds || [];
      if (!rewards.length || rewards.some((productId) => !isDatabaseId(productId))) return true;
      if (pair.triggerType === "PRODUCT") return !pair.requiredProductIds.length || pair.requiredProductIds.some((productId) => !isDatabaseId(productId)) || pair.requiredProductIds.some((productId) => rewards.includes(productId)) || !!pair.requiredCategoryIds.length;
      if (pair.triggerType === "CATEGORY") return !pair.requiredCategoryIds.length || pair.requiredCategoryIds.some((categoryId) => !isDatabaseId(categoryId)) || !!pair.requiredProductIds.length;
      return pair.triggerType !== "ALL" || !!pair.requiredProductIds.length || !!pair.requiredCategoryIds.length;
    })) throw new Error("Choose valid buy conditions and one or more valid reward products for every combo rule.");
    const saved = await prisma.$transaction(async (tx) => {
      if (data.couponCode) {
        const duplicate = await tx.campaign.findFirst({ where: { couponCode: data.couponCode, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
        if (duplicate) throw new Error("That coupon code is already in use.");
      }
      const pairProductIds = [...new Set(data.configuration.productPairs.flatMap((pair) => [...(pair.rewardProductIds || []), ...(pair.triggerType === "PRODUCT" ? pair.requiredProductIds : [])]))];
      const pairCategoryIds = [...new Set(data.configuration.productPairs.filter((pair) => pair.triggerType === "CATEGORY").flatMap((pair) => pair.requiredCategoryIds))];
      if (pairProductIds.length && await tx.product.count({ where: { id: { in: pairProductIds } } }) !== pairProductIds.length) throw new Error("One or more combo products do not exist.");
      if (pairCategoryIds.length && await tx.category.count({ where: { id: { in: pairCategoryIds } } }) !== pairCategoryIds.length) throw new Error("One or more combo categories do not exist.");
      if (productIds.length) {
        const count = await tx.product.count({ where: { id: { in: productIds } } });
        if (count !== productIds.length) throw new Error("One or more selected products do not exist.");
      }
      if (categoryIds.length) {
        const count = await tx.category.count({ where: { id: { in: categoryIds } } });
        if (count !== categoryIds.length) throw new Error("One or more selected categories do not exist.");
      }
      // A parent category target includes its descendant categories too.
      let campaignCategoryIds = categoryIds;
      if (categoryIds.length) {
        const allCategories = await tx.category.findMany({ select: { id: true, parentCategoryId: true } });
        const descendants = new Set(categoryIds);
        let changed = true;
        while (changed) {
          changed = false;
          for (const category of allCategories) {
            if (category.parentCategoryId && descendants.has(category.parentCategoryId) && !descendants.has(category.id)) {
              descendants.add(category.id);
              changed = true;
            }
          }
        }
        campaignCategoryIds = [...descendants];
      }
      const campaign = id
        ? await tx.campaign.update({ where: { id }, data })
        : await tx.campaign.create({ data: { ...data, createdBy: userId || null } });
      await tx.campaignProduct.deleteMany({ where: { campaignId: campaign.id } });
      await tx.campaignCategory.deleteMany({ where: { campaignId: campaign.id } });
      if (productIds.length) await tx.campaignProduct.createMany({ data: productIds.map((productId) => ({ campaignId: campaign.id, productId })) });
      if (campaignCategoryIds.length) await tx.campaignCategory.createMany({ data: campaignCategoryIds.map((categoryId) => ({ campaignId: campaign.id, categoryId })) });
      return campaign;
    });
    revalidatePath("/admin/campaigns");
    revalidatePath("/");
    revalidatePath("/campaign");
    revalidatePath("/campaign/[id]", "page");
    revalidateTag("campaigns");
    revalidateTag("home-storefront");
    revalidatePath("/category/[...slug]", "page");
    revalidatePath("/product/[slug]", "page");
    return { success: true, data: saved };
  } catch (error) { return resultError(error); }
}

export async function deleteCampaign(id) {
  try {
    await hasPermission("campaign", "delete");
    if (!isDatabaseId(String(id || ""))) throw new Error("Invalid campaign.");
    const existing = await prisma.campaign.findUnique({ where: { id }, include: { _count: { select: { usages: true } } } });
    if (!existing) throw new Error("Campaign not found.");
    if (existing._count.usages > 0) throw new Error("A campaign already used by an order cannot be deleted.");
    await prisma.campaign.delete({ where: { id } });
    revalidatePath("/admin/campaigns");
    revalidatePath("/");
    revalidatePath("/campaign");
    revalidatePath("/campaign/[id]", "page");
    revalidateTag("campaigns");
    revalidateTag("home-storefront");
    return { success: true };
  } catch (error) { return resultError(error); }
}

export async function setCampaignStatus(id, status) {
  try {
    await hasPermission("campaign", "update");
    if (!isDatabaseId(String(id || ""))) throw new Error("Invalid campaign.");
    const nextStatus = String(status || "").toUpperCase();
    if (!["PUBLISHED", "PAUSED", "DRAFT", "EXPIRED"].includes(nextStatus)) throw new Error("Invalid campaign status.");
    const campaign = await prisma.campaign.update({ where: { id }, data: { status: nextStatus, updatedBy: await getUserId() } });
    revalidatePath("/admin/campaigns");
    revalidatePath("/");
    revalidatePath("/campaign");
    revalidatePath("/campaign/[id]", "page");
    revalidateTag("campaigns");
    revalidateTag("home-storefront");
    return { success: true, data: campaign };
  } catch (error) { return resultError(error); }
}
