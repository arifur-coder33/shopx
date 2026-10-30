/**
 * Chat AI reply: Matches customer images against catalog product photos.
 * Keep this module focused on one step of the reply pipeline.
 */
import prisma from "@/lib/prisma";
import sharp from "sharp";
import { DEFAULT_CHAT_AI_MODELS, isChatAiModelAllowed } from "@/backend/services/chatAiModels";
import { createImageFingerprint, fingerprintDistance } from "@/backend/utils/imageFingerprint.mjs";
import { decryptProviderCredentials } from "@/backend/services/providerCredentialService";
import { describeCustomerImage } from "./customerMedia.js";
import { findSearchProducts } from "@/backend/utils/findSearchProducts";
import { searchImageCatalog, selectImageSearchProducts } from "@/backend/utils/chatImageSelection.mjs";

export async function rankCatalogImageHashes(image, candidateProductIds, preparedFingerprint = null) {
  if (!image?.base64) return [];
  const fingerprint = preparedFingerprint || await createImageFingerprint(Buffer.from(image.base64, "base64"));
  if (!fingerprint) return [];

  const products = await prisma.product.findMany({
    where: {
      ...(candidateProductIds.length ? { id: { in: candidateProductIds } } : {}),
      isActive: true,
      status: "ACTIVE",
    },
    take: candidateProductIds.length ? 3000 : 5000,
    orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      thumbnail: {
        select: { imageDifferenceHash: true, imageAverageHash: true },
      },
      gallery: {
        select: {
          media: {
            select: { imageDifferenceHash: true, imageAverageHash: true },
          },
        },
      },
      variations: {
        select: {
          thumbnail: {
            select: { imageDifferenceHash: true, imageAverageHash: true },
          },
        },
      },
    },
  });
  const ranked = [];
  for (const product of products) {
    const media = [
      product.thumbnail,
      ...(product.gallery || []).map((item) => item.media),
      ...(product.variations || []).map((item) => item.thumbnail),
    ].filter((item) => item?.imageDifferenceHash && item?.imageAverageHash);
    let bestScore = Infinity;
    for (const item of media) {
      const differenceDistance = fingerprintDistance(
        fingerprint.imageDifferenceHash,
        item.imageDifferenceHash,
      );
      const averageDistance = fingerprintDistance(
        fingerprint.imageAverageHash,
        item.imageAverageHash,
      );
      bestScore = Math.min(bestScore, differenceDistance + averageDistance);
    }
    if (Number.isFinite(bestScore)) {
      const similarity = Math.round((1 - bestScore / 128) * 100);
      ranked.push({ id: product.id, similarity });
    }
  }
  return ranked.sort((left, right) => right.similarity - left.similarity);
}

export async function searchCatalogByCustomerImage(sourceBytes) {
  const setting = await prisma.chatSetting.findUnique({
    where: { id: "primary" },
    select: { aiAutoReplyEnabled: true, aiProvider: true, openaiModel: true, googleAiStudioModel: true, encryptedCredentials: true },
  });
  if (!setting?.aiAutoReplyEnabled || !setting.encryptedCredentials) return { enabled: false, products: [] };
  const credentials = decryptProviderCredentials(setting.encryptedCredentials);
  const provider = setting.aiProvider === "GOOGLE_AI_STUDIO" ? "GOOGLE_AI_STUDIO" : "OPENAI";
  const apiKey = provider === "GOOGLE_AI_STUDIO" ? credentials.googleAiStudioApiKey : credentials.openaiApiKey;
  if (!apiKey) return { enabled: false, products: [] };
  const model = provider === "GOOGLE_AI_STUDIO"
    ? (isChatAiModelAllowed(provider, setting.googleAiStudioModel) ? setting.googleAiStudioModel : DEFAULT_CHAT_AI_MODELS.GOOGLE_AI_STUDIO)
    : (isChatAiModelAllowed(provider, setting.openaiModel) ? setting.openaiModel : DEFAULT_CHAT_AI_MODELS.OPENAI);
  const normalized = await sharp(sourceBytes, { limitInputPixels: 40_000_000 })
    .rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  if (!normalized.length || normalized.length > 3 * 1024 * 1024) throw new Error("ছবিটি AI-তে পাঠানোর জন্য ছোট করে নেওয়া যায়নি।");
  const image = { mimeType: "image/jpeg", base64: normalized.toString("base64") };
  const ai = { provider, model, apiKey };
  const descriptionPromise = describeCustomerImage(ai, image, "Navbar image search", { fast: true });
  const fingerprintFallbackPromise = createImageFingerprint(normalized).catch(() => null);
  const description = await descriptionPromise;
  const candidates = await searchImageCatalog(description, (query) => findSearchProducts(query, {
    id: true, title: true, status: true,
  }, 80, { status: "ACTIVE" }));
  let similarFallback = false;
  let fingerprints = [];
  let allProductIds = [];
  if (!candidates.length) {
    fingerprints = await rankCatalogImageHashes(image, [], await fingerprintFallbackPromise).catch(() => []);
    const selection = selectImageSearchProducts(fingerprints, fingerprints);
    const ids = selection.products.map((product) => product.id);
    allProductIds = selection.allProductIds;
    similarFallback = ids.length > 0;
    const products = ids.length ? await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true, status: "ACTIVE" },
      select: { id: true, title: true, slug: true, thumbnail: { select: { name: true } } },
    }) : [];
    const byId = new Map(products.map((product) => [product.id, product]));
    return {
      enabled: true,
      query: description.productName || description.productType || description.searchTerms?.[0] || "",
      similarFallback,
      allProductIds,
      products: ids.map((id) => ({ ...byId.get(id), similarity: fingerprints.find((match) => match.id === id)?.similarity, matchType: "similar" })).filter((product) => product.id),
    };
  }
  fingerprints = await rankCatalogImageHashes(image, candidates.map((product) => product.id)).catch(() => []);
  const selection = selectImageSearchProducts(candidates, fingerprints);
  const selectedIds = selection.products.map((product) => product.id);
  allProductIds = selection.allProductIds;
  const products = selectedIds.length ? await prisma.product.findMany({
    where: { id: { in: selectedIds }, isActive: true, status: "ACTIVE" },
    select: { id: true, title: true, slug: true, thumbnail: { select: { name: true } } },
  }) : [];
  const byId = new Map(products.map((product) => [product.id, product]));
  return {
    enabled: true,
    query: description.productName || description.productType || description.searchTerms?.[0] || "",
    similarFallback: fingerprints.length > 0,
    allProductIds,
    products: selection.products.map((selected) => ({ ...byId.get(selected.id), ...(selected.similarity != null && { similarity: selected.similarity, matchType: "similar" }) })).filter((product) => product.id),
  };
}

export async function isConfiguredChatAIAvailable() {
  try {
    const setting = await prisma.chatSetting.findUnique({
      where: { id: "primary" },
      select: { aiAutoReplyEnabled: true, aiProvider: true, encryptedCredentials: true },
    });
    if (!setting?.aiAutoReplyEnabled || !setting.encryptedCredentials) return false;
    const credentials = decryptProviderCredentials(setting.encryptedCredentials);
    return setting.aiProvider === "GOOGLE_AI_STUDIO"
      ? Boolean(credentials.googleAiStudioApiKey)
      : Boolean(credentials.openaiApiKey);
  } catch {
    return false;
  }
}
