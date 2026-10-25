import { isConfiguredChatAIAvailable, searchCatalogByCustomerImage } from "@/backend/services/chatAiReplyService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const buckets = globalThis.__navbarImageSearchBuckets || (globalThis.__navbarImageSearchBuckets = new Map());

function allowSearch(request) {
  const ip = (request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown").split(",")[0].trim();
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (bucket && bucket.expiresAt > now && bucket.count >= 12) return false;
  if (!bucket || bucket.expiresAt <= now) buckets.set(ip, { count: 1, expiresAt: now + 60_000 });
  else bucket.count += 1;
  if (buckets.size > 5000) for (const [key, value] of buckets) if (value.expiresAt <= now) buckets.delete(key);
  return true;
}

export async function GET() {
  return Response.json({ enabled: await isConfiguredChatAIAvailable() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 9 * 1024 * 1024) return Response.json({ success: false, message: "ছবির সাইজ ৮ MB-এর মধ্যে রাখুন।" }, { status: 413 });
    if (!allowSearch(request)) return Response.json({ success: false, message: "অল্পক্ষণ পরে আবার ছবি দিয়ে খুঁজুন।" }, { status: 429 });
    const form = await request.formData();
    const image = form.get("image");
    if (!image || typeof image.arrayBuffer !== "function") {
      return Response.json({ success: false, message: "একটি product photo বেছে নিন।" }, { status: 400 });
    }
    if (!/^image\/(?:jpeg|png|webp)$/u.test(image.type || "")) {
      return Response.json({ success: false, message: "JPG, PNG বা WebP ছবি ব্যবহার করুন।" }, { status: 415 });
    }
    if (image.size <= 0 || image.size > 8 * 1024 * 1024) {
      return Response.json({ success: false, message: "ছবির সাইজ ৮ MB-এর মধ্যে রাখুন।" }, { status: 413 });
    }
    const result = await searchCatalogByCustomerImage(Buffer.from(await image.arrayBuffer()));
    if (!result.enabled) return Response.json({ success: false, enabled: false, message: "AI image search এখন চালু নেই।" }, { status: 503 });
    return Response.json({ success: true, query: result.query || "", products: result.products || [], allProductIds: result.allProductIds || (result.products || []).map((product) => product.id), similarFallback: Boolean(result.similarFallback) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ success: false, message: error?.message || "ছবি দিয়ে পণ্য খোঁজা যায়নি। আবার চেষ্টা করুন।" }, { status: 500 });
  }
}
