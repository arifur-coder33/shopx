/**
 * Chat AI reply: Coordinates inbound messages, AI decisions, order flow, and reply delivery.
 * Keep this module focused on one step of the reply pipeline.
 */
import prisma from "@/lib/prisma";
import { CHAT_AI_PROMPT_VERSION } from "@/backend/services/chat/prompt";
import { DEFAULT_CHAT_AI_MODELS, isChatAiModelAllowed } from "@/backend/services/chatAiModels";
import { calculateDeliveryCharge } from "@/lib/deliveryCharge";
import { canOrderCatalogProduct, isAiReplyEnabledForChannel, plainChatText, settingId } from "./foundation.js";
import { classifyAmbiguousCustomerMessage, getProductMemory } from "./productMemory.js";
import { collectWebsiteHandoffContact } from "@/backend/services/chatHumanHandoffService";
import { createImageFingerprint } from "@/backend/utils/imageFingerprint.mjs";
import { decryptProviderCredentials } from "@/backend/services/providerCredentialService";
import { deliverReply, stopForHumanTakeover } from "./replyDelivery.js";
import { describeCustomerImage, findProductLinkInMessage, getCustomerImage, imageAttachmentFor } from "./customerMedia.js";
import { dispatchChatReply } from "@/backend/services/chatReplyDispatch.mjs";
import { explicitAddressPreference, hasInboundImage, isProductImageRequest, isProductVideoRequest, needsHumanFollowUp, shouldAutoReply } from "@/backend/utils/chatAiPreferences.mjs";
import { findSearchProducts } from "@/backend/utils/findSearchProducts";
import { generateNaturalReply } from "@/backend/services/chat/decisions/generateNaturalReply";
import { generateReply } from "./replyGeneration.js";
import { getCatalog } from "./catalogLookup.js";
import { getCheckoutDeliveryRates } from "@/backend/services/deliveryChargeService";
import { getSiteUrl } from "@/lib/siteUrl";
import { getVerifiedOrders } from "./orderContext.js";
import { handleChatOrderStatusFlow } from "@/backend/services/chatOrderStatusService";
import { handleMessengerOrderFlow } from "@/backend/services/chatMessengerOrderFlow";
import { humanHandoffReason, humanHandoffReply, isRepeatedCustomerQuestion } from "@/backend/utils/chatHumanHandoff.mjs";
import { isChatOrderCreationEnabled } from "@/backend/services/chatOrderSettings";
import { loadBusinessContext } from "@/backend/services/chat/context/loadBusinessContext";
import { loadConversationHistory } from "@/backend/services/chat/context/loadConversationHistory";
import { rankCatalogImageHashes } from "./catalogImages.js";
import { runChatReplyBatch, mergedInboundMessage, newerInboundWhere } from "@/backend/services/chatReplyBatchService";
import { searchImageCatalog, selectImageSearchProducts } from "@/backend/utils/chatImageSelection.mjs";
import { startChatTypingIndicator } from "@/backend/services/chatTypingIndicator.mjs";
import { transcribeChatAudio } from "@/backend/services/chatAudioTranscriptionService";

export async function maybeSendChatAiReply(conversationId, inboundMessageId) {
  return dispatchChatReply({
    conversationId,
    inboundMessageId,
    db: prisma,
    reply: (messageId, leaseToken) => sendBatchedChatAiReply(conversationId, messageId, leaseToken),
    batch: runChatReplyBatch,
  });
}

export async function sendBatchedChatAiReply(conversationId, inboundMessageId, leaseToken) {
  let aiMessage = null;
  let stopTyping = null;
  let aiProviderUsed = "OPENAI";
  let aiModelUsed = DEFAULT_CHAT_AI_MODELS.OPENAI;
  try {
    const [setting, initialConversation, inbound] = await Promise.all([
      prisma.chatSetting.findUnique({
        where: { id: settingId },
        select: {
          aiAutoReplyEnabled: true,
          aiReplyWebsiteEnabled: true,
          aiReplyWhatsAppEnabled: true,
          aiReplyMessengerEnabled: true,
          aiReplyInstagramEnabled: true,
          aiReplyTikTokEnabled: true,
          quickReplies: true,
          aiReplyTone: true,
          aiMaleAddressTerm: true,
          aiFemaleAddressTerm: true,
          aiReplyExamples: true,
          aiProvider: true,
          openaiModel: true,
          googleAiStudioModel: true,
          whatsappTextTemplateName: true,
          whatsappImageTemplateName: true,
          whatsappTemplateLanguage: true,
          encryptedCredentials: true,
        },
      }),
      prisma.chatConversation.findUnique({ where: { id: conversationId } }),
      prisma.chatMessage.findUnique({ where: { id: inboundMessageId } }).then((message) => message ? mergedInboundMessage(message) : null),
    ]);
    if (inbound) inbound.replyLeaseToken = leaseToken;
    if (await collectWebsiteHandoffContact(initialConversation, inbound)) return;
    if (
      !setting?.aiAutoReplyEnabled ||
      !isAiReplyEnabledForChannel(setting, initialConversation?.channel) ||
      !setting.encryptedCredentials ||
      !initialConversation ||
      !inbound ||
      inbound.conversationId !== conversationId ||
      !shouldAutoReply({
        globalEnabled: setting.aiAutoReplyEnabled,
        conversation: initialConversation,
        inbound,
      })
    ) {
      if (/^(?:select|order|checkout):/u.test(String(inbound?.metadata?.quickReplyPayload || ""))) console.warn("Chat checkout action blocked:", {
        channel: initialConversation?.channel,
        globalAiEnabled: Boolean(setting?.aiAutoReplyEnabled),
        conversationAiEnabled: Boolean(initialConversation?.aiModeEnabled),
        assignedToHuman: Boolean(initialConversation?.assignedToId),
        conversationStatus: initialConversation?.status,
      });
      return;
    }

    const existingReply = await prisma.chatMessage.findUnique({
      where: { aiReplyForMessageId: inbound.id },
      select: { id: true },
    });
    if (existingReply) return;

    let conversation = initialConversation;

    const newerHumanOutbound = await prisma.chatMessage.findFirst({
      where: {
        conversationId,
        direction: "OUTBOUND",
        authorType: "AGENT",
        createdAt: { gt: inbound.createdAt },
      },
      select: { id: true },
    });
    if (newerHumanOutbound) return;

    const credentials = decryptProviderCredentials(
      setting.encryptedCredentials,
    );
    credentials.whatsappTextTemplateName =
      setting.whatsappTextTemplateName || "";
    credentials.whatsappImageTemplateName =
      setting.whatsappImageTemplateName || "";
    credentials.whatsappTemplateLanguage =
      setting.whatsappTemplateLanguage || "bn";
    const aiConfig = {
      provider:
        setting.aiProvider === "GOOGLE_AI_STUDIO"
          ? "GOOGLE_AI_STUDIO"
          : "OPENAI",
      model:
        setting.aiProvider === "GOOGLE_AI_STUDIO"
          ? isChatAiModelAllowed(
              "GOOGLE_AI_STUDIO",
              setting.googleAiStudioModel,
            )
            ? setting.googleAiStudioModel
            : DEFAULT_CHAT_AI_MODELS.GOOGLE_AI_STUDIO
          : isChatAiModelAllowed("OPENAI", setting.openaiModel)
            ? setting.openaiModel
            : DEFAULT_CHAT_AI_MODELS.OPENAI,
      apiKey:
        setting.aiProvider === "GOOGLE_AI_STUDIO"
          ? credentials.googleAiStudioApiKey
          : credentials.openaiApiKey,
    };
    aiProviderUsed = aiConfig.provider;
    aiModelUsed = aiConfig.model;
    stopTyping = startChatTypingIndicator(conversation, inbound, credentials, {
      isActive: async () => {
        const fresh = await prisma.chatConversation.findUnique({ where: { id: conversationId }, select: {
          aiModeEnabled: true, assignedToId: true, status: true, aiReplyLeaseToken: true,
        } });
        return Boolean(fresh?.aiModeEnabled && !fresh.assignedToId && fresh.status === "OPEN" && (!leaseToken || fresh.aiReplyLeaseToken === leaseToken));
      },
    });
    const audioMessage = Boolean(
      inbound.metadata?.audio?.mediaId || inbound.metadata?.audio?.url ||
      inbound.metadata?.attachments?.some((attachment) => String(attachment?.type || "").toLowerCase() === "audio"),
    );
    if (audioMessage) {
      try {
        const transcript = await transcribeChatAudio(inbound, conversation.channel, credentials, aiConfig);
        if (transcript) {
          inbound.content = transcript;
          inbound.metadata = { ...(inbound.metadata || {}), audioTranscription: { status: "COMPLETED", text: transcript } };
        } else {
          inbound.content = "The customer sent an audio message, but transcription was unavailable. Reply in the customer's language asking them to resend the audio or type their message.";
          inbound.metadata = { ...(inbound.metadata || {}), audioTranscription: { status: "UNAVAILABLE" } };
        }
      } catch (error) {
        console.warn("Customer chat audio transcription failed:", error?.message || error);
        inbound.content = "The customer sent an audio message, but transcription failed. Reply in the customer's language asking them to resend the audio or type their message.";
        inbound.metadata = { ...(inbound.metadata || {}), audioTranscription: { status: "FAILED" } };
      }
      await prisma.chatMessage.update({ where: { id: inbound.id }, data: { metadata: inbound.metadata } }).catch((error) => {
        console.warn("Audio transcription status could not be saved:", error?.message || error);
      });
    }
    const preference = explicitAddressPreference(inbound.content);
    if (preference) {
      conversation = await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { preferredAddress: preference },
      });
    }
    aiMessage = await prisma.chatMessage.create({
      data: {
        conversationId,
        channel: conversation.channel,
        direction: "OUTBOUND",
        authorType: "AI",
        content: "",
        deliveryStatus: "SENDING",
        aiReplyForMessageId: inbound.id,
      },
    });

    if (
      await handleMessengerOrderFlow({
        conversation,
        inbound,
        credentials,
        canCreateOrder: isChatOrderCreationEnabled(setting),
        existingOnly: true,
        startProductId: inbound.metadata?.replyTo?.productId || null,
        startVariantId: inbound.metadata?.replyTo?.variantId || null,
      })
    )
      return;
    // Google AI Studio has no matching server-side tool loop in this service;
    // keep its established verified order-status flow. OpenAI uses get_order_status.
    if (setting.aiProvider === "GOOGLE_AI_STUDIO" && await handleChatOrderStatusFlow({ conversation, inbound, credentials })) return;
    if (!aiConfig.apiKey) throw new Error("নির্বাচিত AI provider-এর API key configure করা নেই।");

    let { history, productAnchor } = await loadConversationHistory(
      prisma,
      conversationId,
      inbound,
    );
    let productMemory = getProductMemory(
      productAnchor ? [productAnchor, ...history] : history,
      inbound.content,
      inbound.metadata,
    );
    if (productMemory.newProductSearch) {
      const shortIntent = await classifyAmbiguousCustomerMessage(aiConfig, inbound.content);
      if (shortIntent !== "PRODUCT") {
        const priorContext = productAnchor ? [productAnchor, ...history] : history;
        productMemory = { ...getProductMemory(priorContext, "", inbound.metadata), newProductSearch: false };
      }
    }
    const attachment = imageAttachmentFor(inbound);
    let customerImage = null;
    let imageDescription = null;
    let imageAnalysisFailed = false;
    let imageFingerprintFallbackPromise = null;

    if (attachment && hasInboundImage(inbound.metadata)) {
      try {
        customerImage = await getCustomerImage(
          conversation,
          { ...attachment, messageId: inbound.externalMessageId },
          credentials,
        );
        if (customerImage) {
          imageFingerprintFallbackPromise = createImageFingerprint(Buffer.from(customerImage.base64, "base64")).catch((error) => {
            console.warn("Fallback image fingerprints unavailable:", error?.message || error);
            return null;
          });
          imageDescription = await describeCustomerImage(
            aiConfig,
            customerImage,
            inbound.content,
          );
        }
      } catch (imageError) {
        imageAnalysisFailed = true;
        console.warn(
          "Customer chat image could not be analyzed:",
          imageError?.message || imageError,
        );
      }
    }
    const inboundProductLink = customerImage
      ? null
      : await findProductLinkInMessage(inbound.content).catch((error) => {
          console.warn("Product link lookup failed:", error?.message || error);
          return null;
        });
    let imageSearchCandidates = [];
    let imageSearchSelection = { products: [], threshold: null, steps: [] };
    let imageSearchFailed = imageAnalysisFailed;
    let imageSearchSimilarFallback = false;
    if (customerImage) {
      try {
        imageSearchCandidates = await searchImageCatalog(imageDescription || {}, async (query) => {
          const products = await findSearchProducts(query, { id: true, title: true, status: true }, 100);
          return products.filter((product) => product.status === "ACTIVE");
        });
        let fingerprints = imageSearchCandidates.length
          ? await rankCatalogImageHashes(customerImage, imageSearchCandidates.map((product) => product.id)).catch((error) => {
              console.warn("Candidate image fingerprints unavailable:", error?.message || error);
              return [];
            })
          : [];
        if (!imageSearchCandidates.length && imageFingerprintFallbackPromise) {
          fingerprints = await rankCatalogImageHashes(customerImage, [], await imageFingerprintFallbackPromise);
          const selection = selectImageSearchProducts(fingerprints, fingerprints);
          imageSearchCandidates = selection.products
            .map((match) => ({ id: match.id, similarity: match.similarity, matchType: "similar" }));
          imageSearchSimilarFallback = imageSearchCandidates.length > 0;
          if (imageSearchSimilarFallback) {
            imageSearchSelection = {
              ...selection,
              products: imageSearchCandidates,
            };
          }
        } else {
          imageSearchSelection = selectImageSearchProducts(imageSearchCandidates, fingerprints);
          imageSearchCandidates = imageSearchSelection.products;
          imageSearchSimilarFallback = fingerprints.length > 0;
        }
      } catch (error) {
        imageSearchFailed = true;
        console.warn("Image catalog search failed:", error?.message || error);
      }
    }
    const imageProductIds = imageSearchSelection.products.map((product) => product.id);
    const catalogProductIds = customerImage
      ? imageProductIds
      : inboundProductLink?.productId
        ? [inboundProductLink.productId]
        : (isProductImageRequest(inbound.content) || isProductVideoRequest(inbound.content)) &&
            !productMemory.newProductSearch && productMemory.pageProductId
          ? [...new Set([...productMemory.catalogProductIds, productMemory.pageProductId])]
          : productMemory.catalogProductIds;
    const { products: productContext, orders: verifiedOrders } = await loadBusinessContext({
      getCatalog,
      getVerifiedOrders,
      customerText: inbound.content,
      selectedProductIds: catalogProductIds,
      categoryIds: customerImage ? [] : productMemory.catalogCategoryIds,
      conversation,
      history,
      aiConfig,
      forceCatalogSearch: Boolean(customerImage) || Boolean(inboundProductLink?.productId),
      customerImage: Boolean(customerImage),
    });
    if (customerImage) productContext.products.sort((a, b) => imageProductIds.indexOf(a.id) - imageProductIds.indexOf(b.id));
    if (await handleMessengerOrderFlow({
      conversation, inbound, credentials, canCreateOrder: isChatOrderCreationEnabled(setting),
      startProductId: productContext.products.find((product) => product.id === productMemory.selectedProductId)?.id || (productContext.products.length === 1 ? productContext.products[0].id : null),
      startVariantId: inbound.metadata?.replyTo?.variantId || null,
    })) return;
    const requiresHumanFollowUp = needsHumanFollowUp({
      messageText: inbound.content,
      hasVerifiedOrder: verifiedOrders.length > 0,
    });
    const contactOnlyRequest =
      conversation.channel === "WEBSITE" &&
      !isChatOrderCreationEnabled(setting) &&
      /(?:অর্ডার\s*(?:করতে|করব|করবো|দিতে)|\border\s*(?:korbo|korte|dite|now)\b|কিনতে চাই|নিতে চাই)/iu.test(
        inbound.content,
      );
    const rejectsPreviousProductMatch =
      /(?:\b(?:wrong\s+product|not\s+(?:this|same|matching)|doesn['’]?t\s+match|does\s+not\s+match)\b|(?:এটা|এইটা|এটি|eita|eta|this)\s*(?:মিলে\s*না|মেলেনি|ম্যাচ\s*(?:হয়নি|হয়নি|করে\s*না)|মিলেনা|mile\s*na[iy]|match\s*(?:kore\s*na|hoyni)|mila\s*na|না|vul|ভুল)|(?:মিলে\s*না|ম্যাচ\s*(?:হয়নি|হয়নি|করে\s*না)|মিলেনা|mile\s*na[iy]|ভুল\s*(?:প্রোডাক্ট|পণ্য)))/iu.test(
        inbound.content,
      );
    let generated = contactOnlyRequest
      ? {
          text: "আপনার নাম, ফোন নম্বর ও সম্পূর্ণ ঠিকানা দিন। আমাদের একজন প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।",
          imageMatch: "none",
          products: [],
        }
      : inboundProductLink?.isUrl && !inboundProductLink.isStoreDomain
        ? {
            text: "দুঃখিত, এটি আমাদের ওয়েবসাইটের লিংক নয়। দয়া করে আমাদের ওয়েবসাইটের কোনো পণ্যের লিংক দিন।",
            imageMatch: "none",
            products: [],
          }
        : inboundProductLink?.isProductLink
          ? inboundProductLink.productId && productContext.products[0]
            ? {
                text: `জি, আপনার পাঠানো লিংকের পণ্যটি হলো ${productContext.products[0].title}। বিস্তারিত কার্ডে দিলাম।`,
                imageMatch: "none",
                products: [productContext.products[0]],
                selectedProductId: productContext.products[0].id,
              }
            : {
                text: "দুঃখিত, এই লিংকে কোনো চালু পণ্য খুঁজে পেলাম না। পণ্যের সঠিক লিংকটি আবার পাঠাবেন?",
                imageMatch: "none",
                products: [],
              }
          : rejectsPreviousProductMatch
            ? {
                text: "দুঃখিত, আগের পণ্যের মিলটি ঠিক হয়নি। পণ্যের নাম বা আরেকটি পরিষ্কার ছবি দিলে আবার খুঁজে দেখব।",
                imageMatch: "none",
                products: [],
              }
            : customerImage && aiConfig.provider === "GOOGLE_AI_STUDIO"
              ? productContext.products.length
                ? { text: "", imageMatch: "none", products: [] }
                : {
                    text: "ছবিটি পেয়েছি, তবে এখনো পণ্যটির সঙ্গে মিল খুঁজে পাইনি। পণ্যের নাম বা website link দিলে খুঁজে দেখব।",
                    imageMatch: "none",
                    products: [],
                  }
            : await generateNaturalReply(generateReply, [
                  aiConfig,
                  conversation,
                  history,
                  productContext,
                  verifiedOrders,
                  conversation.preferredAddress,
                  customerImage,
                  setting.aiReplyTone,
                  setting.aiReplyExamples,
                  productMemory,
                  {
                    searchCatalog: (query) => getCatalog(query, [], conversation.channel, [], [], null, true),
                    loadCatalogProduct: async (productId) => {
                      const result = await getCatalog("", [], conversation.channel, [productId], [], null, false);
                      return result.products.find((product) => product.id === productId) || null;
                    },
                    loadCampaigns: (query) => getCatalog(query || "active campaign", [], conversation.channel, [], [], null, false),
                    getDeliveryRates: () => getCheckoutDeliveryRates().catch(() => null),
                    calculateDeliveryCharge,
                  },
                  {
                    male: setting.aiMaleAddressTerm || "",
                    female: setting.aiFemaleAddressTerm || "",
                  },
                ]);
    if (!contactOnlyRequest && customerImage) {
      const asksForAlternatives = /(?:আরও|অন্যান্য|বিকল্প|এরকম\s*আর|এ\s*রকম\s*আর|similar|another|more\s+(?:option|product))/iu.test(inbound.content);
      const matches = productContext.products.slice(0, asksForAlternatives ? 3 : 1);
      const productSuggestionText = "আপনি এই পণ্যগুলো দেখতে পারেন।";
      generated = {
        ...generated,
        text: matches.length
          ? productSuggestionText
          : imageSearchFailed || !imageDescription?.productName
            ? 'ছবির তথ্য দিয়ে এই মুহূর্তে পণ্যটি খুঁজে বের করা যায়নি। পণ্যের নাম বা লিংক দিলে আবার খুঁজে দেখব।'
            : 'ছবির নাম, লেখা ও ব্যবহার দিয়ে মিল থাকা পণ্য পাওয়া যায়নি। পণ্যের লিংক বা কোড দিলে খুঁজে দেখব।',
        imageMatch: matches.length ? "alternative" : "none",
        products: matches,
        mediaPhoto: null,
        mediaPhotos: [],
        videoLinks: [],
        imageSearch: {
          failed: imageSearchFailed,
          similarFallback: imageSearchSimilarFallback,
          candidateCount: imageSearchCandidates.length,
          threshold: imageSearchSelection.threshold,
          steps: imageSearchSelection.steps,
          selectedProductIds: matches.map((product) => product.id),
        },
      };
    }
    const activeProductId = generated.selectedProductId || productMemory.selectedProductId || (productContext.products.length === 1 ? productContext.products[0].id : null);
    const handoffReason = humanHandoffReason({
      customerText: inbound.content, reply: generated, requiresHumanFollowUp,
      knownProduct: Boolean(activeProductId && productContext.products.some((product) => product.id === activeProductId)),
      repeatedQuestion: isRepeatedCustomerQuestion(history, inbound.content, activeProductId),
    });
    const handoff = handoffReason ? humanHandoffReply({
      channel: conversation.channel,
      reason: handoffReason,
      customerPhone: conversation.customerPhone || conversation.normalizedPhone,
      english: !/[অ-৿]/u.test(inbound.content) && !/\b(?:ami|apni|ki|koto|ache|ase|hobe|chai|lagbe|bolen|koren|deben)\b/iu.test(inbound.content) && /\b(?:what|how|where|why|please|can|could|is|are|does|need|want|speak|talk)\b/iu.test(inbound.content),
    }) : null;
    if (handoff) {
      // Queueing a question leaves AI available for the customer's next question.
      if (!conversation.needsHumanAssistant) generated = {
        ...generated,
        text: handoffReason === "REPEATED_QUESTION" && generated.humanAssistance !== "REPEATED_QUESTION"
          ? `${generated.text}\n\n${handoff.text}` : handoff.text,
        products: [], imageMatch: "none", mediaPhoto: null, mediaPhotos: [], videoLinks: [],
      };
      else {
        handoff.awaitingPhone = conversation.awaitingHumanPhone;
        if (handoffReason !== "REPEATED_QUESTION" || generated.humanAssistance === "REPEATED_QUESTION") generated = {
          ...generated, text: "আপনার প্রশ্নটি প্রতিনিধির জন্য রাখা আছে।", products: [], imageMatch: "none", mediaPhoto: null, mediaPhotos: [], videoLinks: [],
        };
      }
    }
    const content = plainChatText(generated.text)
      .replace(/(?:আমাদের\s+)?(?:ক্যাটালগে|catalogue?-এ)/giu, "আমাদের কাছে")
      .replace(/(?:ক্যাটালগ|catalogue?)/giu, "পণ্যের তথ্য");

    const newerInbound = await prisma.chatMessage.findFirst({ where: newerInboundWhere(inbound), select: { id: true } });
    if (newerInbound || await stopForHumanTakeover(conversationId, inbound, aiMessage.id)) {
      await prisma.chatMessage.update({
        where: { id: aiMessage.id },
        data: {
          content: newerInbound ? "Reply paused to include the customer's newer messages." : "AI reply paused because a human agent took over.",
          deliveryStatus: "FAILED",
          metadata: {
            aiPromptVersion: CHAT_AI_PROMPT_VERSION,
            internalOnly: true,
            aiErrorCode: newerInbound ? "batch_superseded" : "human_takeover",
          },
        },
      });
      return;
    }

    if (handoff) await prisma.$transaction([
      prisma.chatConversation.update({ where: { id: conversationId }, data: {
        needsHumanAssistant: true, humanAssistantReason: handoffReason, awaitingHumanPhone: handoff.awaitingPhone,
      } }),
      prisma.chatMessage.update({ where: { id: inbound.id }, data: { metadata: {
        ...(inbound.metadata || {}), needsHumanAssistant: true, humanAssistantReason: handoffReason,
      } } }),
    ]);
    const delivery = await deliverReply(
      conversation,
      content,
      credentials,
      generated.products,
      generated.mediaPhoto,
      generated.videoLinks,
      generated.mediaPhotos,
      generated.seeMoreUrl,
    );
    const productOptions = generated.products.map((product) => {
      const prices = product.variants
        .map(
          (variant) =>
            variant.currentCampaignPrice ||
            variant.listedPrice ||
            variant.regularPrice,
        )
        .filter((value) => Number(value) > 0)
        .map(Number);
      return {
        id: product.id,
        title: product.title,
        productCode: product.productCode,
        imageUrl: product.imageUrls[0] || null,
        price: prices.length ? Math.min(...prices) : null,
        inStock: product.variants.some((variant) => variant.availableStock > 0),
        canOrder: canOrderCatalogProduct(product),
        allowOutOfStockOrder: product.allowOutOfStockOrder,
        features: product.features.slice(0, 4),
        url: product.url,
        buyNowUrl: product.buyNowUrl,
        variants: product.variants.slice(0, 20).map((variant) => ({
          id: variant.id,
          label: variant.options.join(" / ") || "সাধারণ",
          imageUrl: variant.imageUrl || product.imageUrls[0] || null,
          price:
            variant.currentCampaignPrice ||
            variant.listedPrice ||
            variant.regularPrice,
          inStock: variant.availableStock > 0,
          canOrder: variant.availableStock > 0 || product.allowOutOfStockOrder,
        })),
      };
    });
    const messageMetadata = {
      aiPromptVersion: CHAT_AI_PROMPT_VERSION,
      aiProvider: aiProviderUsed,
      aiModel: aiModelUsed,
      ...(generated.intent && { intent: generated.intent }),
      ...(generated.toolCalls?.length && { toolCalls: generated.toolCalls.slice(0, 8) }),
      batchedMessageIds: inbound.metadata?.batchedMessageIds || [inbound.id],
      ...(productMemory.explicitSelection && { chatOrderFlow: { step: "done", reason: "product_selection" } }),
      ...(contactOnlyRequest && {
        type: "CONTACT_FORM",
        productId: productMemory.selectedProductId || null,
      }),
      handoffRequired: Boolean(handoff),
      productSearchReset: productMemory.newProductSearch || Boolean(customerImage),
      ...(handoff && { type: "HUMAN_ASSISTANCE", humanAssistantReason: handoffReason, awaitingHumanPhone: handoff.awaitingPhone, assistanceForMessageId: inbound.id }),
      ...(generated.imageSearch && { imageSearch: generated.imageSearch }),
      ...(generated.priceNegotiation && {
        priceNegotiation: generated.priceNegotiation,
      }),
      ...(productContext.categories?.length && {
        categoryOptions: productContext.categories.flatMap((category) => [
          {
            id: category.id,
            name: category.name,
            categoryIds: [
              category.id,
              ...category.subcategories.map((item) => item.id),
            ],
          },
          ...category.subcategories.map((item) => ({
            id: item.id,
            name: item.name,
            categoryIds: [item.id],
          })),
        ]),
      }),
      ...(delivery.imageWarnings.length && {
        imageWarnings: delivery.imageWarnings,
      }),
      ...(!rejectsPreviousProductMatch &&
        (generated.selectedProductId ||
          (generated.products.length === 1 ? generated.products[0].id : null) ||
          productMemory.selectedProductId) && {
          selectedProductId:
            generated.selectedProductId ||
            (generated.products.length === 1
              ? generated.products[0].id
              : null) ||
            productMemory.selectedProductId,
        }),
      ...(!rejectsPreviousProductMatch &&
        productMemory.pageProductId && {
          pageProductId: productMemory.pageProductId,
          pageProductTitle: productMemory.pageProductTitle,
          pageProductConfirmed: productMemory.pageProductConfirmed,
          pageProductConfirmationPending:
            productMemory.pageProductConfirmationRequired,
        }),
      ...(imageDescription && {
        customerImageDescription: imageDescription.description,
        customerImageDescriptionBn: imageDescription.bengaliDescription,
        customerImageBrandModel: imageDescription.brandModel,
      }),
    };
    const websiteCardMessages =
      conversation.channel === "WEBSITE" && productOptions.length
        ? [
            prisma.chatMessage.create({
              data: {
                conversationId,
                channel: "WEBSITE",
                direction: "OUTBOUND",
                authorType: "AI",
                content: `পণ্যের সাজেশন: ${productOptions.map((product) => product.title).join(", ")}`,
                deliveryStatus: "SENT",
                createdAt: new Date(Date.now() + 1),
                metadata: {
                  type: "PRODUCT_CARD",
                  aiPromptVersion: CHAT_AI_PROMPT_VERSION,
                  productSuggestionGroupId: inbound.id,
                  productOptions,
                  shownProductIds: productOptions.map((product) => product.id),
                  ...(generated.seeMoreUrl && { seeMoreUrl: generated.seeMoreUrl }),
                },
              },
            }),
          ]
        : [];
    const websiteMediaMessages =
      conversation.channel === "WEBSITE"
        ? (generated.mediaPhotos || []).map((photo, index) =>
            prisma.chatMessage.create({
              data: {
                conversationId,
                channel: "WEBSITE",
                direction: "OUTBOUND",
                authorType: "AI",
                content: `📷 ${photo.productTitle} · ছবি ${index + 1}`,
                deliveryStatus: "SENT",
                createdAt: new Date(Date.now() + index + 1),
                metadata: {
                  type: "PRODUCT_MEDIA",
                  image: photo,
                  selectedProductId: photo.productId,
                  shownProductIds: [photo.productId],
                },
              },
            }),
          )
        : [];
    const externalMediaMessages =
      conversation.channel !== "WEBSITE"
        ? delivery.mediaMessages.map((media, index) => {
            const option =
              media.product &&
              productOptions.find((product) => product.id === media.product.id);
            const carouselOptions = (media.products || [])
              .map((item) =>
                productOptions.find((product) => product.id === item.id),
              )
              .filter(Boolean);
            const shownOptions = carouselOptions.length
              ? carouselOptions
              : option
                ? [option]
                : [];
            return prisma.chatMessage.create({
              data: {
                conversationId,
                channel: conversation.channel,
                direction: "OUTBOUND",
                authorType: "AI",
                content: media.content,
                deliveryStatus: "SENT",
                externalMessageId: media.id || null,
                createdAt: new Date(Date.now() + index + 1),
                metadata: {
                  type: "PRODUCT_MEDIA",
                  aiPromptVersion: CHAT_AI_PROMPT_VERSION,
                  ...(media.image && {
                    image: media.image,
                    shownProductIds: [media.image.productId],
                  }),
                  ...(shownOptions.length && {
                    productOptions: shownOptions,
                    shownProductIds: shownOptions.map((item) => item.id),
                  }),
                  ...(media.image?.productId && {
                    selectedProductId: media.image.productId,
                  }),
                  ...(media.productId && {
                    selectedProductId: media.productId,
                  }),
                  ...(option && { selectedProductId: option.id }),
                  ...(shownOptions.length > 1 && {
                    productSuggestionGroupId: inbound.id,
                  }),
                  ...(media.seeMoreUrl && { seeMoreUrl: media.seeMoreUrl }),
                  ...(media.callbackWarning && { callbackWarning: media.callbackWarning }),
                },
              },
            });
          })
        : [];
    await prisma.$transaction([
      prisma.chatMessage.update({
        where: { id: aiMessage.id },
        data: {
          content: generated.videoLinks?.length
            ? content.split("\n")[0]
            : content,
          deliveryStatus: "SENT",
          ...(delivery.id && { externalMessageId: delivery.id }),
          metadata: messageMetadata,
        },
      }),
      ...websiteCardMessages,
      ...websiteMediaMessages,
      ...externalMediaMessages,
      prisma.chatConversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          consecutiveAiFailures: 0,
          ...(handoff && {
            needsHumanAssistant: true,
            humanAssistantReason: handoffReason,
            awaitingHumanPhone: handoff.awaitingPhone,
          }),
        },
      }),
    ]);
  } catch (error) {
    if (error?.code === "P2002") return;
    console.error("AI chat reply failed:", {
      provider: aiProviderUsed,
      code: error?.code || "ai_reply_failed",
      message: error?.message || String(error),
    });
    if (aiMessage?.id) {
      await prisma.$transaction(async (tx) => {
        // Claim this failure once, even if the same inbound event is retried.
        const failedReply = await tx.chatMessage.findUnique({ where: { id: aiMessage.id }, select: { metadata: true } });
        const failed = await tx.chatMessage.updateMany({
          where: { id: aiMessage.id, deliveryStatus: "SENDING" },
          data: {
            content: "AI reply তৈরি হয়নি। API configuration ও server log দেখুন।",
            deliveryStatus: "FAILED",
            metadata: {
              ...(failedReply?.metadata || {}),
              aiPromptVersion: CHAT_AI_PROMPT_VERSION, aiProvider: aiProviderUsed, aiModel: aiModelUsed,
              internalOnly: true, aiErrorCode: String(error?.code || "ai_reply_failed").slice(0, 100),
            },
          },
        });
        if (!failed.count) return;
        const source = await tx.chatMessage.findUnique({ where: { id: inboundMessageId }, select: { metadata: true } });
        const failureState = await tx.chatConversation.update({
          where: { id: conversationId },
          data: { consecutiveAiFailures: { increment: 1 }, needsHumanAssistant: true, humanAssistantReason: "AI_REPLY_FAILED" },
          select: { consecutiveAiFailures: true },
        });
        if (failureState.consecutiveAiFailures >= 3) await tx.chatConversation.update({
          where: { id: conversationId }, data: { aiModeEnabled: false },
        });
        if (source) await tx.chatMessage.update({ where: { id: inboundMessageId }, data: { metadata: {
          ...(source.metadata || {}), needsHumanAssistant: true, humanAssistantReason: "AI_REPLY_FAILED",
        } } });
      }).catch((recordError) => console.error("Human assistance flag could not be saved:", recordError?.code || "update_failed"));
    }
  } finally {
    if (stopTyping) await stopTyping();
  }
}
