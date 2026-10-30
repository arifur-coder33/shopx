/**
 * Chat AI reply: Loads, scores, and formats verified products for AI replies.
 * Keep this module focused on one step of the reply pipeline.
 */
import Fuse from "fuse.js";
import prisma from "@/lib/prisma";
import { BROAD_CATALOG_QUESTION, CAMPAIGN_QUESTION, GENERIC_PRODUCT_MATCH_TERMS, POLICY_QUESTION, PRODUCT_BROWSE_TERMS, PRODUCT_SEARCH_STOPWORDS, plainChatText } from "./foundation.js";
import { applyProductCampaign, campaignBasePrice, getActiveCampaigns } from "@/backend/services/campaignService";
import { calculateDeliveryCharge } from "@/lib/deliveryCharge";
import { deriveCatalogSearchTerms, extractPriceBudget, isStockQuestion } from "./productMemory.js";
import { getCheckoutDeliveryRates } from "@/backend/services/deliveryChargeService";
import { getPublicSiteIdentity } from "@/backend/services/siteAppearanceService";
import { getSiteUrl } from "@/lib/siteUrl";
import { isContactInfoQuestion, loadPublicContactInfo } from "@/backend/services/chat/context/loadPublicContactInfo";
import { isDeliveryQuestion, isProductImageRequest, isProductQuestion, isProductVideoRequest } from "@/backend/utils/chatAiPreferences.mjs";

export async function getCatalog(
  messageText,
  imageTerms = [],
  channel = "WEBSITE",
  rememberedProductIds = [],
  rememberedCategoryIds = [],
  ai = null,
  forceProductSearch = false,
) {
  const siteIdentity = await getPublicSiteIdentity().catch(() => ({ name: "Shop" }));
  const isBroadCatalogBrowse = !rememberedProductIds.length && !imageTerms.length && BROAD_CATALOG_QUESTION.test(
    String(messageText || ""),
  );
  const wantsProducts =
    isProductQuestion(messageText) ||
    isProductImageRequest(messageText) ||
    isProductVideoRequest(messageText) ||
    imageTerms.length > 0 ||
    rememberedProductIds.length > 0 ||
    rememberedCategoryIds.length > 0 ||
    forceProductSearch;
  const wantsDelivery = isDeliveryQuestion(messageText);
  const wantsCampaignInfo = CAMPAIGN_QUESTION.test(String(messageText || ""));
  const wantsPolicyInfo = POLICY_QUESTION.test(String(messageText || ""));
  const wantsContactInfo = isContactInfoQuestion(messageText);
  const deferProductSearch =
    ai?.provider === "OPENAI" &&
    !forceProductSearch &&
    !rememberedProductIds.length &&
    !rememberedCategoryIds.length &&
    !imageTerms.length &&
    wantsProducts;
  const priceBudget = extractPriceBudget(messageText);
  const semanticSearchTerms =
    wantsProducts &&
    !deferProductSearch &&
    !isBroadCatalogBrowse &&
    !imageTerms.length &&
    !rememberedProductIds.length
      ? await deriveCatalogSearchTerms(ai, messageText)
      : [];
  let categories = [];
  if (isBroadCatalogBrowse) {
    const activeProduct = { isActive: true, status: "ACTIVE" };
    const categoryRows = await prisma.category.findMany({
      where: {
        OR: [
          { products: { some: activeProduct } },
          { subCategories: { some: { products: { some: activeProduct } } } },
        ],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, parentCategoryId: true },
    });
    const childrenByParent = new Map();
    for (const category of categoryRows) {
      if (!category.parentCategoryId) continue;
      const children = childrenByParent.get(category.parentCategoryId) || [];
      children.push({ id: category.id, name: category.name });
      childrenByParent.set(category.parentCategoryId, children);
    }
    categories = categoryRows
      .filter((category) => !category.parentCategoryId)
      .map((category) => ({
        id: category.id,
        name: category.name,
        subcategories: childrenByParent.get(category.id) || [],
      }));
  }
  if (
    !wantsProducts &&
    !wantsDelivery &&
    !wantsCampaignInfo &&
    !wantsPolicyInfo
  )
    return {
      products: [],
      categories,
      delivery: null,
      campaignInfo: [],
      policies: [],
    };
  const rawTerms = [
    ...new Set([
      ...semanticSearchTerms.flatMap(
        (term) =>
          String(term)
            .toLowerCase()
            .match(/[\p{L}\p{N}]{3,}/gu) || [],
      ),
      ...(String(messageText)
        .toLowerCase()
        .match(/[\p{L}\p{N}]{3,}/gu) || []),
      ...imageTerms.flatMap(
        (term) =>
          String(term)
            .toLowerCase()
            .match(/[\p{L}\p{N}]{3,}/gu) || [],
      ),
    ]),
  ];
  const colorAliases = {
    black: ["black", "kalo", "কালো"],
    kalo: ["kalo", "black", "কালো"],
    কালো: ["কালো", "kalo", "black"],
  };
  const terms = [
    ...new Set(
      rawTerms
        .filter(
          (term) =>
            !PRODUCT_SEARCH_STOPWORDS.has(term) &&
            !PRODUCT_BROWSE_TERMS.has(term),
        )
        .flatMap((term) => colorAliases[term] || [term]),
    ),
  ].slice(0, 14);
  const resultLimit = Math.max(rememberedProductIds.length, imageTerms.length ? 24 : ["WEBSITE", "MESSENGER"].includes(channel) ? 11 : 8);
  const queryCatalog = async (
    searchTerms,
    categoryIds = [],
    productIds = [],
  ) => {
    if (
      !searchTerms.length &&
      !rememberedProductIds.length &&
      !categoryIds.length &&
      !productIds.length
    )
      return Promise.resolve([]);
    const where = rememberedProductIds.length
      ? {
          isActive: true,
          status: "ACTIVE",
          id: { in: rememberedProductIds },
        }
      : {
          isActive: true,
          status: "ACTIVE",
          OR: [
            ...rememberedProductIds.map((id) => ({ id })),
            ...productIds.map((id) => ({ id })),
            ...(categoryIds.length
              ? [{ categoryId: { in: categoryIds } }]
              : []),
            ...searchTerms.flatMap((term) => [
              { title: { contains: term, mode: "insensitive" } },
              { description: { contains: term, mode: "insensitive" } },
              { searchText: { contains: term, mode: "insensitive" } },
              {
                questionsAnswers: {
                  some: {
                    OR: [
                      { question: { contains: term, mode: "insensitive" } },
                      { answer: { contains: term, mode: "insensitive" } },
                    ],
                  },
                },
              },
              {
                specifications: {
                  some: { value: { contains: term, mode: "insensitive" } },
                },
              },
              {
                variations: {
                  some: {
                    combinations: {
                      some: {
                        variationValue: {
                          is: {
                            value: { contains: term, mode: "insensitive" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ]),
          ],
        };
    const found = await prisma.product.findMany({
      where,
      take: rememberedProductIds.length || (priceBudget ? 100 : 40),
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        productCode: true,
        slug: true,
        description: true,
        videoUrl: true,
        videos: {
          orderBy: { sortOrder: "asc" },
          select: { header: true, url: true, sortOrder: true },
        },
        seoDescription: true,
        seoKeyWord: true,
        canonicalUrl: true,
        gender: true,
        ageGroup: true,
        codAvailable: true,
        advancePaymentType: true,
        advancePaymentValueType: true,
        advancePaymentValue: true,
        hasVariations: true,
        photoReviews: rememberedProductIds.length ? {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
          select: { rating: true, reviewText: true, image: { select: { url: true, name: true } } },
        } : false,
        questionsAnswers: {
          orderBy: { sortOrder: "asc" },
          take: rememberedProductIds.length ? undefined : 8,
          select: { question: true, answer: true },
        },
        categoryId: true,
        specifications: {
          orderBy: { sortOrder: "asc" },
          take: rememberedProductIds.length ? undefined : 8,
          select: { value: true, specification: { select: { name: true } } },
        },
        deliveryMinDays: true,
        deliveryMaxDays: true,
        allowOutOfStockOrder: true,
        category: { select: { name: true } },
        thumbnail: { select: { url: true, name: true } },
        gallery: {
          take: imageTerms.length || rememberedProductIds.length ? undefined : 6,
          orderBy: { createdAt: "asc" },
          select: { media: { select: { url: true, name: true } } },
        },
        variations: {
          take: imageTerms.length || rememberedProductIds.length ? undefined : 20,
          select: {
            id: true,
            sku: true,
            dimensions: true,
            regularPrice: true,
            discountPrice: true,
            weight: true,
            thumbnail: { select: { url: true, name: true } },
            stocks: { select: { available: true } },
            combinations: {
              select: {
                variationName: { select: { name: true } },
                variationValue: { select: { value: true } },
              },
            },
          },
        },
      },
    });
    const normalizedTerms = searchTerms.map((term) => term.toLowerCase());
    const score = (product) => {
      const title = String(product.title || "").toLowerCase();
      const category = String(product.category?.name || "").toLowerCase();
      const description = String(
        `${product.description || ""} ${product.seoDescription || ""}`,
      ).toLowerCase();
      const specifications = (product.specifications || [])
        .map((item) => `${item.specification?.name || ""} ${item.value || ""}`)
        .join(" ")
        .toLowerCase();
      const questionAnswers = (product.questionsAnswers || [])
        .map((item) => `${item.question || ""} ${item.answer || ""}`)
        .join(" ")
        .toLowerCase();
      const variants = (product.variations || [])
        .flatMap((variation) => variation.combinations || [])
        .map(
          (combination) =>
            `${combination.variationName?.name || ""} ${combination.variationValue?.value || ""}`,
        )
        .join(" ")
        .toLowerCase();
      const prices = (product.variations || [])
        .map((variation) => {
          const regular = Number(variation.regularPrice) || 0;
          const sale = Number(variation.discountPrice) || 0;
          return sale > 0 && sale < regular ? sale : regular;
        })
        .filter((price) => price > 0);
      const lowestPrice = prices.length ? Math.min(...prices) : null;
      const budgetBoost =
        !priceBudget || lowestPrice == null
          ? 0
          : lowestPrice <= priceBudget
            ? 100 + Math.round(((priceBudget - lowestPrice) / priceBudget) * 10)
            : Math.max(
                0,
                45 -
                  Math.round(((lowestPrice - priceBudget) / priceBudget) * 45),
              );
      return (
        budgetBoost +
        (rememberedProductIds.includes(product.id) ? 1000 : 0) +
        normalizedTerms.reduce((total, term) => {
          if (title.includes(term)) return total + (title === term ? 30 : 12);
          if (category.includes(term)) return total + 6;
          if (specifications.includes(term)) return total + 3;
          if (questionAnswers.includes(term)) return total + 5;
          if (variants.includes(term)) return total + 10;
          if (description.includes(term)) return total + 1;
          return total;
        }, 0)
      );
    };
    return found
      .map((product, index) => ({ product, index, score: score(product) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, resultLimit)
      .map(({ product }) => product);
  };
  const productSearch = async () => {
    if (isBroadCatalogBrowse) {
      // broad question e 12 ta featured product dao
      return prisma.product.findMany({
        where: { isActive: true, status: "ACTIVE" },
        take: 12,
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          title: true,
          productCode: true,
          slug: true,
          description: true,
          seoDescription: true,
          categoryId: true,
          specifications: {
            orderBy: { sortOrder: "asc" },
            take: 8,
            select: { value: true, specification: { select: { name: true } } },
          },
          category: { select: { name: true } },
          thumbnail: { select: { url: true, name: true } },
          gallery: {
            take: 3,
            orderBy: { createdAt: "asc" },
            select: { media: { select: { url: true, name: true } } },
          },
          variations: {
            take: 20,
            select: {
              id: true,
              regularPrice: true,
              discountPrice: true,
              weight: true,
              thumbnail: { select: { url: true, name: true } },
              stocks: { select: { available: true } },
              combinations: {
                select: {
                  variationName: { select: { name: true } },
                  variationValue: { select: { value: true } },
                },
              },
            },
          },
          videos: {
            orderBy: { sortOrder: "asc" },
            select: { header: true, url: true, sortOrder: true },
          },
          videoUrl: true,
          deliveryMinDays: true,
          deliveryMaxDays: true,
          allowOutOfStockOrder: true,
        },
      });
    }
    if (!wantsProducts) return [];
    if (forceProductSearch && rememberedProductIds.length) return queryCatalog([]);

    if (rememberedCategoryIds.length)
      return queryCatalog([], rememberedCategoryIds);
    let matches = await queryCatalog(terms);
    if (imageTerms.length) {
      // Search fuzzy catalog text as well as exact terms; exact matches can
      // otherwise hide the correct item when the vision model also emits a
      // broad word such as "battery" or "machine".
      const catalogIndex = await prisma.product.findMany({
        where: { isActive: true, status: "ACTIVE" },
        take: 3000,
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          title: true,
          productCode: true,
          searchText: true,
          seoDescription: true,
          seoKeyWord: true,
          category: { select: { name: true } },
        },
      });
      const fuse = new Fuse(catalogIndex, {
        includeScore: true,
        ignoreLocation: true,
        threshold: 0.46,
        minMatchCharLength: 2,
        keys: [
          { name: "title", weight: 4 },
          { name: "seoKeyWord", weight: 2.5 },
          { name: "category.name", weight: 1.5 },
          { name: "searchText", weight: 1.5 },
          { name: "seoDescription", weight: 1 },
        ],
      });
      const fuzzyRank = new Map();
      const fuzzyTerms = [...new Set(imageTerms)]
        .map((term) => String(term).trim().toLowerCase())
        .filter(
          (term) =>
            term.length >= 2 &&
            !PRODUCT_SEARCH_STOPWORDS.has(term) &&
            !PRODUCT_BROWSE_TERMS.has(term),
        )
        .slice(0, 40);
      for (const term of fuzzyTerms) {
        for (const result of fuse.search(term, { limit: 8 })) {
          const priorScore = fuzzyRank.get(result.item.id) ?? Infinity;
          if ((result.score ?? 1) < priorScore)
            fuzzyRank.set(result.item.id, result.score ?? 1);
        }
      }
      if (fuzzyRank.size) {
        const fuzzyProductIds = [...fuzzyRank]
          .sort((a, b) => a[1] - b[1])
          .slice(0, resultLimit)
          .map(([id]) => id);
        const fuzzyProducts = await queryCatalog([], [], fuzzyProductIds);
        // Keep a couple of strong literal matches, then let visual semantics
        // promote products whose titles use different wording.
        const exactFirst = matches.slice(0, imageTerms.length ? 4 : 2);
        const includedIds = new Set(exactFirst.map((product) => product.id));
        const fuzzyOnly = [...fuzzyProducts]
          .sort(
            (a, b) => (fuzzyRank.get(a.id) ?? 1) - (fuzzyRank.get(b.id) ?? 1),
          )
          .filter((product) => !includedIds.has(product.id));
        matches = [
          ...exactFirst,
          ...fuzzyOnly,
          ...matches.slice(exactFirst.length),
        ].slice(0, resultLimit);
      }
    }
    if (matches.length) {
      if (forceProductSearch) {
        if (imageTerms.length) return matches.slice(0, resultLimit);
        const directTitleMatches = matches.filter((product) =>
          terms.some(
            (term) =>
              !GENERIC_PRODUCT_MATCH_TERMS.has(term) &&
              `${product.title || ""} ${product.category?.name || ""}`
                .toLowerCase()
                .includes(term),
          ),
        );
        if (directTitleMatches.length) return directTitleMatches.slice(0, resultLimit);
      }
      const stockQuestion = isStockQuestion(messageText);
      const selected = matches.find((product) =>
        rememberedProductIds.includes(product.id),
      );
      const selectedHasStock = selected?.variations?.some((variant) =>
        variant.stocks.some((stock) => Number(stock.available || 0) > 0),
      );
      if (stockQuestion && selected && !selectedHasStock) {
        const relatedTerms =
          String(selected.title || "")
            .toLowerCase()
            .match(/[\p{L}\p{N}]{3,}/gu) || [];
        const alternatives = await queryCatalog(
          relatedTerms.filter((term) => !PRODUCT_SEARCH_STOPWORDS.has(term)),
          selected.categoryId ? [selected.categoryId] : [],
        );
        const inStockAlternatives = alternatives.filter(
          (product) =>
            product.id !== selected.id &&
            product.variations.some((variant) =>
              variant.stocks.some((stock) => Number(stock.available || 0) > 0),
            ),
        );
        return [selected, ...inStockAlternatives].slice(0, 8);
      }
      return matches;
    }
    return terms.length ? queryCatalog(terms) : [];
  };
  const now = new Date();
  const [products, campaigns, deliveryRates, campaignInfo, policyPages, contactInfo] =
    await Promise.all([
      deferProductSearch ? Promise.resolve([]) : productSearch(),
      wantsProducts && !deferProductSearch
        ? getActiveCampaigns({ includeComboDisplayNames: false }).catch(
            () => [],
          )
        : Promise.resolve([]),
      wantsDelivery
        ? getCheckoutDeliveryRates().catch(() => null)
        : Promise.resolve(null),
      wantsCampaignInfo
        ? prisma.campaign
            .findMany({
              where: {
                status: "PUBLISHED",
                AND: [
                  { OR: [{ startAt: null }, { startAt: { lte: now } }] },
                  { OR: [{ endAt: null }, { endAt: { gte: now } }] },
                ],
              },
              orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
              take: 12,
              select: {
                id: true,
                name: true,
                description: true,
                terms: true,
                group: true,
                type: true,
                discountType: true,
                discountValue: true,
                specialPrice: true,
                maxDiscountAmount: true,
                minimumOrderAmount: true,
                minimumQuantity: true,
                startAt: true,
                endAt: true,
                couponCode: true,
                paymentMethod: true,
                paymentMethods: true,
                products: {
                  take: 8,
                  select: { product: { select: { title: true } } },
                },
                categories: {
                  take: 8,
                  select: { category: { select: { name: true } } },
                },
              },
            })
            .catch((error) => {
              console.warn(
                "Active campaign context could not be loaded:",
                error?.message || error,
              );
              return null;
            })
        : Promise.resolve([]),
      wantsPolicyInfo
        ? prisma.contentPage
            .findMany({
              where: {
                isPublished: true,
                OR: [
                  { slug: { contains: "policy", mode: "insensitive" } },
                  { slug: { contains: "return", mode: "insensitive" } },
                  { slug: { contains: "refund", mode: "insensitive" } },
                  { slug: { contains: "exchange", mode: "insensitive" } },
                  { title: { contains: "policy", mode: "insensitive" } },
                  { title: { contains: "return", mode: "insensitive" } },
                  { title: { contains: "refund", mode: "insensitive" } },
                  { title: { contains: "exchange", mode: "insensitive" } },
                  { title: { contains: "রিটার্ন" } },
                  { title: { contains: "ফেরত" } },
                  { title: { contains: "রিফান্ড" } },
                  { title: { contains: "এক্সচেঞ্জ" } },
                  { title: { contains: "পলিসি" } },
                  { title: { contains: "নীতিমালা" } },
                  { title: { contains: "নীতি" } },
                ],
              },
              orderBy: { updatedAt: "desc" },
              take: 12,
              select: { slug: true, title: true, content: true },
            })
            .catch((error) => {
              console.warn(
                "Policy page context could not be loaded:",
                error?.message || error,
              );
              return null;
            })
        : Promise.resolve([]),
      wantsContactInfo ? loadPublicContactInfo() : Promise.resolve(null),
    ]);
  const siteUrl = await getSiteUrl();
  const publicCampaignInfo = (campaignInfo || []).map((campaign) => ({
    name: campaign.name,
    description: campaign.description,
    terms: campaign.terms,
    group: campaign.group,
    type: campaign.type,
    discountType: campaign.discountType,
    discountValue: campaign.discountValue,
    specialPrice: campaign.specialPrice,
    maxDiscountAmount: campaign.maxDiscountAmount,
    minimumOrderAmount: campaign.minimumOrderAmount,
    minimumQuantity: campaign.minimumQuantity,
    startAt: campaign.startAt?.toISOString() || null,
    endAt: campaign.endAt?.toISOString() || null,
    couponCode: campaign.couponCode,
    paymentMethod: campaign.paymentMethod,
    paymentMethods: campaign.paymentMethods,
    products: campaign.products.map((item) => item.product.title),
    categories: campaign.categories.map((item) => item.category.name),
    url: new URL(
      `/campaign/${encodeURIComponent(campaign.id)}`,
      siteUrl,
    ).toString(),
  }));
  const policies = (policyPages || []).map((page) => {
    const content = String(page.content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim();

    const configured =
      content &&
      !/(?:এখানে\s*লিখুন|write\s+(?:your|the)|enter\s+(?:your|the))/iu.test(
        content,
      );
    return {
      title: page.title,
      content: configured ? content.slice(0, 2500) : null,
      configured: Boolean(configured),
      url: new URL(`/${encodeURIComponent(page.slug)}`, siteUrl).toString(),
    };
  });
  const publicContactInfo = contactInfo?.available ? {
    details: contactInfo.details,
    pageTitle: contactInfo.pageTitle || "Contact",
    pageContent: plainChatText(contactInfo.pageContent || "").replace(/\s+/g, " ").slice(0, 2500) || null,
    pageUrl: contactInfo.pageUrl || "/contact",
  } : null;
  return {
    shopName: siteIdentity.name || "Shop",
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      productCode: product.productCode || null,
      slug: product.slug,
      seoDescription: product.seoDescription || null,
      seoKeyWord: product.seoKeyWord || null,
      canonicalUrl: product.canonicalUrl || null,
      gender: product.gender || null,
      ageGroup: product.ageGroup || null,
      codAvailable: product.codAvailable,
      advancePaymentType: product.advancePaymentType || null,
      advancePaymentValueType: product.advancePaymentValueType || null,
      advancePaymentValue: product.advancePaymentValue ?? null,
      hasVariations: product.hasVariations,
      reviews: (product.photoReviews || []).map((review) => ({
        rating: review.rating,
        text: plainChatText(review.reviewText),
        imageUrl: review.image?.url || (review.image?.name ? new URL(`/uploads/${review.image.name}`, siteUrl).toString() : null),
      })),
      category: product.category?.name || null,
      description: plainChatText(
        product.description || product.seoDescription || "",
      )
        .replace(/\s+/g, " ")
        .slice(0, rememberedProductIds.length ? undefined : 2500),
      questionsAnswers: (product.questionsAnswers || []).map((row) => ({
        question: plainChatText(row.question),
        answer: plainChatText(row.answer),
      })),
      features: product.specifications
        .map((specification) =>
          plainChatText(
            `${specification.specification.name}: ${specification.value}`,
          ),
        )
        .slice(0, rememberedProductIds.length ? undefined : 8),
      url: new URL(
        `/product/${encodeURIComponent(product.slug)}`,
        siteUrl,
      ).toString(),
      buyNowUrl: new URL(
        product.hasVariations || product.variations.length > 1
          ? `/product/${encodeURIComponent(product.slug)}`
          : `/buynow/${encodeURIComponent(product.slug)}`,
        siteUrl,
      ).toString(),
      imageUrls: [
        ...new Set(
          [
            product.thumbnail?.url ||
              (product.thumbnail?.name
                ? `/uploads/${product.thumbnail.name}`
                : null),
            ...product.gallery.map(
              ({ media }) =>
                media?.url || (media?.name ? `/uploads/${media.name}` : null),
            ),
            ...product.variations.map(
              (variant) =>
                variant.thumbnail?.url ||
                (variant.thumbnail?.name
                  ? `/uploads/${variant.thumbnail.name}`
                  : null),
            ),
          ]
            .filter(Boolean)
            .map((image) => {
              try {
                const parsed = new URL(image, siteUrl);
                const allowedDomain =
                  parsed.hostname === new URL(siteUrl).hostname ||
                  parsed.hostname === "cloudinary.com" ||
                  parsed.hostname.endsWith(".cloudinary.com");
                if (parsed.protocol !== "https:" || !allowedDomain) return null;
                if (
                  /\/(?:video|videos)\/(?:upload\/)?|\.(?:mp4|webm|mov)$/iu.test(
                    parsed.pathname,
                  )
                )
                  return null;
                if (
                  channel === "TIKTOK" &&
                  parsed.hostname !== "cloudinary.com" &&
                  !parsed.hostname.endsWith(".cloudinary.com")
                )
                  return null;
                return parsed.toString();
              } catch {
                return null;
              }
            })
            .filter(Boolean),
        ),
      ],
      galleryImageUrls: [
        ...new Set((product.gallery || []).map(({ media }) => {
          const image = media?.url || (media?.name ? `/uploads/${media.name}` : null);
          if (!image) return null;
          try {
            const parsed = new URL(image, siteUrl);
            const host = new URL(siteUrl).hostname;
            return parsed.protocol === "https:" && (parsed.hostname === host || parsed.hostname === "cloudinary.com" || parsed.hostname.endsWith(".cloudinary.com")) ? parsed.toString() : null;
          } catch { return null; }
        }).filter(Boolean)),
      ],
      videos: (product.videos.length
        ? product.videos
        : product.videoUrl
          ? [{ header: "পণ্যের ভিডিও", url: product.videoUrl, sortOrder: 0 }]
          : []
      )
        .filter((video) => {
          try {
            return ["https:", "http:"].includes(new URL(video.url).protocol);
          } catch {
            return false;
          }
        })
        .map((video) => ({ header: video.header, url: video.url })),
      deliveryEstimateDays:
        product.deliveryMinDays && product.deliveryMaxDays
          ? `${product.deliveryMinDays}-${product.deliveryMaxDays}`
          : null,
      allowOutOfStockOrder: product.allowOutOfStockOrder,
      variants: product.variations.map((variant) => {
        const regularPrice = Number(variant.regularPrice) || 0;
        const listedDiscount = Number(variant.discountPrice) || 0;
        const basePrice = campaignBasePrice(variant);
        const campaign = applyProductCampaign({
          campaigns,
          productId: product.id,
          categoryId: product.categoryId,
          basePrice,
        });
        const available = variant.stocks.reduce(
          (sum, stock) => sum + Number(stock.available || 0),
          0,
        );
        return {
          id: variant.id,
          sku: variant.sku || null,
          dimensions: variant.dimensions || null,
          imageUrl: (() => {
            const rawImage =
              variant.thumbnail?.url ||
              (variant.thumbnail?.name
                ? `/uploads/${variant.thumbnail.name}`
                : null);
            if (!rawImage) return null;
            try {
              const parsed = new URL(rawImage, siteUrl);
              const siteHost = new URL(siteUrl).hostname;
              const trusted =
                parsed.hostname === siteHost ||
                parsed.hostname === "cloudinary.com" ||
                parsed.hostname.endsWith(".cloudinary.com");
              return parsed.protocol === "https:" &&
                trusted &&
                (channel !== "TIKTOK" ||
                  /(^|\.)cloudinary\.com$/i.test(parsed.hostname))
                ? parsed.toString()
                : null;
            } catch {
              return null;
            }
          })(),
          options: variant.combinations
            .map((combination) =>
              [
                combination.variationName?.name,
                combination.variationValue?.value,
              ]
                .filter(Boolean)
                .join(": "),
            )
            .filter(Boolean),
          colorLabel: variant.combinations.find((combination) => /^(?:color|colour|রং|রঙ)$/iu.test(String(combination.variationName?.name || "").trim()))?.variationValue?.value || null,
          regularPrice: regularPrice || null,
          listedPrice: basePrice || null,
          currentCampaignPrice: campaign.campaign ? campaign.price : null,
          campaignName: campaign.campaign?.name || null,
          availableStock: available,
          stockState:
            available > 0
              ? "IN_STOCK"
              : product.allowOutOfStockOrder
                ? "OUT_OF_STOCK_ORDER_ALLOWED"
                : "OUT_OF_STOCK",
          listedDiscount:
            listedDiscount > 0 && listedDiscount < regularPrice
              ? listedDiscount
              : null,
          weightKg: Number(variant.weight) || null,
        };
      }),
    })),
    categories,
    delivery: deliveryRates
      ? {
          insideDhakaBase: calculateDeliveryCharge(
            "inside-dhaka",
            1,
            deliveryRates,
          ),
          outsideDhakaBase: calculateDeliveryCharge(
            "outside-dhaka",
            1,
            deliveryRates,
          ),
          additionalKg: deliveryRates.additionalKgCharge,
        }
      : null,
    campaignInfo: publicCampaignInfo,
    campaignInfoAvailable: Array.isArray(campaignInfo),
    policies,
    policyInfoAvailable: Array.isArray(policyPages),
    publicContactInfo,
    contactInfoAvailable: contactInfo ? Boolean(contactInfo.available) : false,
    priceBudget,
    searchQuery:
      imageTerms.find((term) => String(term).trim().includes(" ")) ||
      semanticSearchTerms.find((term) => String(term).trim().includes(" ")) ||
      imageTerms[0] ||
      semanticSearchTerms[0] ||
      terms.find((term) => !GENERIC_PRODUCT_MATCH_TERMS.has(term)) ||
      String(messageText || "").trim(),
  };
}
