/**
 * Chat AI reply: Shared AI provider, policy, and address helpers.
 * Keep this module focused on one step of the reply pipeline.
 */
import prisma from "@/lib/prisma";
import { DEFAULT_CHAT_AI_MODELS, isChatAiModelAllowed } from "@/backend/services/chatAiModels";
import { decryptProviderCredentials } from "@/backend/services/providerCredentialService";
import { htmlToText } from "html-to-text";
import { normalizeChatText } from "@/lib/chatText";
import { runOpenAiFunctionLoop } from "@/backend/services/chat/ai/openAiFunctionLoop";

export const settingId = "primary";

export const AI_REPLY_CHANNEL_SETTINGS = {
  WEBSITE: "aiReplyWebsiteEnabled",
  WHATSAPP: "aiReplyWhatsAppEnabled",
  MESSENGER: "aiReplyMessengerEnabled",
  INSTAGRAM: "aiReplyInstagramEnabled",
  TIKTOK: "aiReplyTikTokEnabled",
};

export const isAiReplyEnabledForChannel = (setting, channel) => {
  const field = AI_REPLY_CHANNEL_SETTINGS[String(channel || "").toUpperCase()];
  return !field || setting?.[field] !== false;
};

export const ADDRESS_LABELS = {
  BHAI: "ভাই",
  APU: "আপু",
  SIR: "Sir",
  MADAM: "Madam",
  NEUTRAL: "neutral wording (no honorific)",
};

export const PRODUCT_SEARCH_STOPWORDS = new Set([
  "photo",
  "picture",
  "image",
  "pic",
  "video",
  "videos",
  "vedio",
  "vdo",
  "clip",
  "link",
  "unboxing",
  "unbox",
  "setup",
  "setting",
  "installation",
  "install",
  "demo",
  "review",
  "product",
  "products",
  "please",
  "send",
  "show",
  "share",
  "give",
  "want",
  "den",
  "deo",
  "dao",
  "din",
  "pathan",
  "dekhan",
  "chai",
  "price",
  "cost",
  "stock",
  "available",
  "lagbe",
  "delivery",
  "charge",
  "charges",
  "etar",
  "eta",
  "this",
  "that",
  "it",
  "koto",
  "koi",
  "kothay",
  "abar",
  "pathao",
  "patao",
  "button",
  "link",
  "korbo",
  "korte",
  "order",
  "kon",
  "dhoro",
  "jante",
  "dam",
  "damer",
  "koto",
  "kotho",
  "ache",
  "ase",
  "er",
  "ar",
  "the",
  "and",
  "for",
  "দাম",
  "ছবি",
  "ফটো",
  "ভিডিও",
  "ভিডিয়ো",
  "ভিডিওটা",
  "ভিডিওটি",
  "ভিডিওর",
  "ভিডিওগুলো",
  "লিংক",
  "আনবক্সিং",
  "সেটিং",
  "সেটআপ",
  "ইনস্টল",
  "ডেমো",
  "রিভিউ",
  "ছবিটা",
  "ছবিটি",
  "ফটোটা",
  "পণ্য",
  "প্রোডাক্ট",
  "দেন",
  "দিন",
  "দেখান",
  "পাঠান",
  "চাই",
  "এটার",
  "এইটা",
  "কত",
  "আছে",
]);

export const GENERIC_PRODUCT_MATCH_TERMS = new Set([
  "machine",
  "machin",
  "machinary",
  "মেশিন",
  "যন্ত্র",
  "device",
  "item",
  "পণ্য",
  "product",
]);

export const PRODUCT_FOLLOW_UP_TERMS = new Set([
  "warranty",
  "guarantee",
  "quality",
  "feature",
  "features",
  "color",
  "colour",
  "size",
  "stock",
  "delivery",
  "shipping",
  "charge",
  "charges",
  "price",
  "cost",
  "discount",
  "offer",
  "return",
  "refund",
  "exchange",
  "original",
  "ওয়ারেন্টি",
  "গ্যারান্টি",
  "মান",
  "ফিচার",
  "রং",
  "কালার",
  "সাইজ",
  "koi",
  "kothay",
  "abar",
  "pathao",
  "patao",
  "button",
  "order",
  "korbo",
  "korte",
  "deo",
  "dao",
  "অর্ডার",
  "বোতাম",
  "বাটন",
  "আবার",
  "পাঠাও",
  "পাঠান",
  "কোথায়",
  "কোথায়",
  "স্টক",
  "ডেলিভারি",
  "চার্জ",
  "দাম",
  "মূল্য",
  "ছাড়",
  "অফার",
  "video",
  "videos",
  "vedio",
  "vdo",
  "clip",
  "link",
  "photo",
  "picture",
  "image",
  "pic",
  "chobi",
  "unboxing",
  "unbox",
  "setup",
  "setting",
  "installation",
  "install",
  "demo",
  "review",
  "ভিডিও",
  "ভিডিয়ো",
  "ভিডিওটা",
  "ভিডিওটি",
  "ভিডিওর",
  "ভিডিওগুলো",
  "লিংক",
  "ছবি",
  "ছবিটা",
  "ছবিটি",
  "ফটো",
  "ফটোটা",
  "আনবক্সিং",
  "সেটিং",
  "সেটআপ",
  "ইনস্টল",
  "ডেমো",
  "রিভিউ",
]);

export const PRODUCT_BROWSE_TERMS = new Set([
  "ki",
  "kono",
  "dekhao",
  "dekhan",
  "dekhte",
  "dekhaw",
  "diben",
  "paowa",
  "pawa",
  "jabe",
  "apnader",
  "amader",
  "ache",
  "ase",
  "কি",
  "কী",
  "কোনো",
  "কোন",
  "দেখাও",
  "দেখান",
  "দেখতে",
  "দেখি",
  "পাওয়া",
  "যাবে",
  "আপনাদের",
  "আমাদের",
  "আছে",
  "দিবেন",
]);

export const CAMPAIGN_QUESTION =
  /(?:\bcampaign\b|\boffer\b|\bdiscount\b|\bpromo(?:tion)?\b|\bdeal\b|\bchar\b|\bchhar\b|\bchare\b|\bdiscount\b|ক্যাম্পেইন|অফার|ডিসকাউন্ট|ছাড়|ছাড়|প্রচার|ছাড়ে|ছাড়ে)/iu;

export const POLICY_QUESTION =
  /(?:\b(?:return|refund|exchange)\s+policy\b|\bpolicy\b.{0,30}\b(?:return|refund|exchange)\b|\b(?:return|refund|exchange)\b|\bferot\b|\brifund\b|\bexchange\b|রিটার্ন|ফেরত|রিফান্ড|এক্সচেঞ্জ|বদল|পলিসি|নীতিমালা|নীতি)/iu;

export const BROAD_CATALOG_QUESTION =
  /(?:\bwhat\s+(?:products|items|categories)\s+(?:do\s+you\s+have|are\s+available|do\s+you\s+sell)\b|\b(?:ki\s+ki|ki\s+ki\s+dhoro?n?er)\s+(?:product|products|item|category)\b|\bki\s+product\s+ache\b|\bki\s+(?:ki\s+)?(?:ache|ase|pawa\s+jay|paowa\s+jay)\b|\b(?:apnader|apnara|tomader|amader)\s+(?:kache\s+)?ki\s+ki\s+(?:ache|ase|pawa\s+jay|paowa\s+jay)\b|\bwhat\s+do\s+you\s+sell\b|\b(?:apnara|apnader|tomra)\s+(?:ki|ki\s+ki)\s+(?:sell|bikri)\s+koren\b|\b(?:ki|ki\s+ki)\s+(?:sell|bikri)\s+koren\b|কী\s*কী\s*(?:আছে|আসে|পাওয়া\s*যায়|পাওয়া\s*যায়|প্রোডাক্ট|পণ্য|ক্যাটাগরি)|কি\s*কি\s*(?:আছে|আসে|পাওয়া\s*যায়|পাওয়া\s*যায়|প্রোডাক্ট|পণ্য|ক্যাটাগরি)|আপনাদের\s*(?:কাছে\s*)?কি\s*কি\s*(?:আছে|আসে|পাওয়া\s*যায়|পাওয়া\s*যায়)|কোন\s*কোন\s*(?:পণ্য|প্রোডাক্ট)|কি\s*কি\s*বিক্রি\s*করেন|আপনারা\s*কি\s*বিক্রি\s*করেন)/iu;

export function plainChatText(value) {
  let text = String(value || "");
  // Some product descriptions are double-encoded (for example &amp;nbsp;).
  for (let pass = 0; pass < 3; pass += 1) {
    const decoded = htmlToText(text, { wordwrap: false });
    if (decoded === text) break;
    text = decoded;
  }
  return normalizeChatText(text)
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function canOrderCatalogProduct(product) {
  return (
    Boolean(product?.allowOutOfStockOrder) ||
    (product?.variants || []).some(
      (variant) => Number(variant.availableStock) > 0,
    )
  );
}

export function googleSchema(schema) {
  if (Array.isArray(schema)) return schema.map(googleSchema);
  if (!schema || typeof schema !== "object") return schema;
  const converted = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "type" && typeof value === "string")
      converted.type = value.toUpperCase();
    else if (["properties", "items"].includes(key))
      converted[key] = googleSchema(value);
    else if (
      ["required", "enum", "description", "format", "nullable"].includes(key)
    )
      converted[key] = value;
  }
  return converted;
}

export async function googleContentParts(content) {
  const parts = Array.isArray(content)
    ? content
    : [{ type: "input_text", text: String(content || "") }];
  const converted = [];
  let imageCount = 0;
  for (const part of parts) {
    if (part?.type === "input_text" || typeof part === "string") {
      converted.push({
        text: typeof part === "string" ? part : String(part.text || ""),
      });
      continue;
    }
    if (part?.type !== "input_image") continue;
    if (imageCount >= 5) continue;
    const imageUrl = String(part.image_url || "");
    let mimeType;
    let bytes;
    const dataUri = imageUrl.match(
      /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/iu,
    );
    if (dataUri) {
      mimeType = dataUri[1].toLowerCase();
      bytes = Buffer.from(dataUri[2], "base64");
    } else {
      const url = new URL(imageUrl);
      if (url.protocol !== "https:")
        throw new Error("Google AI image URL must use HTTPS.");
      const response = await fetch(url, {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok)
        throw new Error(
          `Catalog photo could not be loaded for Google AI (${response.status}).`,
        );
      mimeType = String(response.headers.get("content-type") || "")
        .split(";")[0]
        .toLowerCase();
      if (!/^image\/(?:jpeg|png|webp|gif)$/u.test(mimeType))
        throw new Error(
          "Catalog photo has an unsupported image type for Google AI.",
        );
      const buffer = await response.arrayBuffer();
      if (!buffer.byteLength || buffer.byteLength > 3 * 1024 * 1024)
        throw new Error(
          "Catalog photo is too large for Google AI image matching.",
        );
      bytes = Buffer.from(buffer);
    }
    if (!bytes.length || bytes.length > 3 * 1024 * 1024)
      throw new Error(
        "Customer photo is too large for Google AI image matching.",
      );
    converted.push({
      inlineData: { mimeType, data: bytes.toString("base64") },
    });
    imageCount += 1;
  }
  return converted;
}

export async function requestAiOutput({
  ai,
  model,
  instructions,
  input,
  maxOutputTokens,
  responseSchema = null,
  tools = null,
  executeTool = null,
  onToolExecuted = null,
}) {
  if (ai.provider === "GOOGLE_AI_STUDIO") {
    const systemTexts = [
      instructions || "",
      ...input
        .filter((item) => item.role === "developer")
        .map((item) =>
          typeof item.content === "string"
            ? item.content
            : JSON.stringify(item.content),
        ),
    ].filter(Boolean);
    const contents = [];
    for (const item of input) {
      if (item.role === "developer" || item.role === "system") continue;
      const role = item.role === "assistant" ? "model" : "user";
      const parts = await googleContentParts(item.content);
      const previous = contents.at(-1);
      if (previous?.role === role) previous.parts.push(...parts);
      else contents.push({ role, parts });
    }
    const googleModel = model?.startsWith("gemini-")
      ? model
      : DEFAULT_CHAT_AI_MODELS.GOOGLE_AI_STUDIO;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent`;
    const sendGoogleRequest = (includeSchema) =>
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": ai.apiKey,
        },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemTexts.join("\n\n") }] },
          generationConfig: {
            responseMimeType: "application/json",
            // Gemini 3 counts its reasoning within the output budget; leave enough room for JSON.
            maxOutputTokens: Math.max(Number(maxOutputTokens) || 0, 1024),

            ...(includeSchema &&
              responseSchema && {
                responseSchema: googleSchema(responseSchema),
              }),
          },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(45000),
      });
    let response = await sendGoogleRequest(true);
    let result = await response.json().catch(() => ({}));
    // Gemini may reject a schema keyword that its structured-output decoder does not support.
    // JSON mode keeps the response parseable and lets the application validate the fields below.
    if (!response.ok && response.status === 400 && responseSchema) {
      response = await sendGoogleRequest(false);
      result = await response.json().catch(() => ({}));
    }
    if (!response.ok) {
      const error = new Error(
        result?.error?.message || "Google AI Studio reply তৈরি করতে পারেনি।",
      );
      error.code = result?.error?.status || `http_${response.status}`;
      throw error;
    }
    const output =
      result.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("\n")
        .trim() || "";
    if (!output) throw new Error("Google AI Studio খালি reply দিয়েছে।");
    return output;
  }
  if (tools?.length && executeTool) {
    return runOpenAiFunctionLoop({
      ai,
      model: model || DEFAULT_CHAT_AI_MODELS.OPENAI,
      instructions,
      input,
      maxOutputTokens,
      responseSchema,
      tools,
      executeTool,
      onToolExecuted,
    });
  }
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ai.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || DEFAULT_CHAT_AI_MODELS.OPENAI,
      store: false,
      ...(instructions && { instructions }),
      input,
      text: {
        format: responseSchema
          ? {
              type: "json_schema",
              name: "chat_ai_reply",
              strict: true,
              schema: responseSchema,
            }
          : { type: "json_object" },
      },
      max_output_tokens: maxOutputTokens,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      result?.error?.message || "OpenAI reply তৈরি করতে পারেনি।",
    );
    error.code =
      result?.error?.code || result?.error?.type || `http_${response.status}`;
    throw error;
  }
  const output = (result.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text)
    .join("\n")
    .trim();
  if (!output) throw new Error("OpenAI খালি reply দিয়েছে।");
  return output;
}

export async function verifyBangladeshDeliveryAddress(address) {
  const unavailable = { available: false, valid: false };
  let aiConfigured = false;
  try {
    const setting = await prisma.chatSetting.findUnique({
      where: { id: "primary" },
      select: { aiDeliveryAddressCheckEnabled: true, aiProvider: true, openaiModel: true, googleAiStudioModel: true, encryptedCredentials: true },
    });
    if (!setting?.aiDeliveryAddressCheckEnabled) return { ...unavailable, skipped: true };
    if (!setting.encryptedCredentials) return unavailable;
    const credentials = decryptProviderCredentials(setting.encryptedCredentials);
    const provider = setting.aiProvider === "GOOGLE_AI_STUDIO" ? "GOOGLE_AI_STUDIO" : "OPENAI";
    const apiKey = provider === "GOOGLE_AI_STUDIO" ? credentials.googleAiStudioApiKey : credentials.openaiApiKey;
    if (!apiKey) return unavailable;
    aiConfigured = true;
    const model = provider === "GOOGLE_AI_STUDIO"
      ? (isChatAiModelAllowed(provider, setting.googleAiStudioModel) ? setting.googleAiStudioModel : DEFAULT_CHAT_AI_MODELS.GOOGLE_AI_STUDIO)
      : (isChatAiModelAllowed(provider, setting.openaiModel) ? setting.openaiModel : DEFAULT_CHAT_AI_MODELS.OPENAI);
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        valid: { type: "boolean" },
        district: { type: "string" },
        thana: { type: "string" },
        reason: { type: "string" },
      },
      required: ["valid", "district", "thana", "reason"],
    };
    const output = await requestAiOutput({
      ai: { provider, apiKey }, model, maxOutputTokens: 256, responseSchema: schema,
      instructions: "যাচাইকারী হিসেবে শুধু বাংলাদেশের ঠিকানা যাচাই করুন। বাংলা, English বা Banglish বুঝুন। ঠিকানায় বাস্তব/পরিচিত জেলা ও তার অধীন থানা/উপজেলা আছে কি না যাচাই করুন। বাসা/রোড/গ্রাম/এলাকা উল্লেখ না থাকলে অসম্পূর্ণ বলুন। অনুমান করে জেলা বা থানা বানাবেন না। ভুল হলে বাংলায় ছোট কারণ এবং কীভাবে ঠিকানা লিখতে হবে তা reason-এ দিন।",
      input: [{ role: "user", content: `এই ডেলিভারি ঠিকানাটি যাচাই করুন: ${String(address || "").slice(0, 500)}` }],
    });
    const result = JSON.parse(output);
    if (result.valid !== true) return { available: true, valid: false, error: result.reason || "ঠিকানাটি সম্পূর্ণ নয়। বাসা/রোড/এলাকা, থানা ও জেলার নামসহ লিখুন।" };
    return {
      available: true,
      valid: true,
      district: String(result.district || "").trim().slice(0, 100) || null,
      thana: String(result.thana || "").trim().slice(0, 100) || null,
    };
  } catch {
    if (aiConfigured) return { available: true, valid: false, error: "AI দিয়ে ঠিকানা যাচাই করা যাচ্ছে না। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।" };
    return unavailable;
  }
}
