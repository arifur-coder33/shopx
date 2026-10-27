import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { mergeInboundBatch } from "./chatReplyBatchCore.mjs";
import { ensureMessengerPostbacks } from "./chatMessengerSubscriptions.mjs";

// Inject infrastructure so these regressions never contact customers or a database.
async function loadFunctions(path, names, dependencies = {}) {
  const source = (await readFile(new URL(path, import.meta.url), "utf8"))
    .replace(/^import .+;\r?$/gm, "").replace(/^export /gm, "");
  return new Function(...Object.keys(dependencies), `${source}\nreturn { ${names.join(", ")} };`)(...Object.values(dependencies));
}

test("select then a written follow-up retains product context without replaying checkout", () => {
  const messages = [
    { id: "a", content: "এটি বেছে নিন", metadata: { quickReplyPayload: "select:product123" } },
    { id: "b", content: "ei beche nilam", metadata: {} },
  ];
  const result = mergeInboundBatch(messages, messages[1]);
  assert.equal(result.metadata.productId, "product123");
  assert.equal(result.metadata.action, "select");
  assert.equal(result.metadata.quickReplyPayload, null);
});

test("selection follow-up keeps the catalog product instead of starting a new product search", async () => {
  const source = await readFile(new URL("./chatAiReplyService.js", import.meta.url), "utf8");
  const functionSource = source.slice(source.indexOf("function getProductMemory("), source.indexOf("async function getCatalog("));
  const dependencies = {
    hasInboundImage: () => false, normalizeDigits: String,
    PRODUCT_SEARCH_STOPWORDS: new Set(), PRODUCT_BROWSE_TERMS: new Set(), PRODUCT_FOLLOW_UP_TERMS: new Set(),
    isDeliveryQuestion: () => false, shouldFetchOrderContext: () => false,
    isProductQuestion: () => false, isProductImageRequest: () => false, isProductVideoRequest: () => false,
  };
  const getMemory = new Function(...Object.keys(dependencies), `${functionSource}\nreturn getProductMemory;`)(...Object.values(dependencies));
  const history = [{ direction: "OUTBOUND", deliveryStatus: "SENT", content: "Winter Jacket", metadata: { productOptions: [{ id: "jacket123", title: "Winter Jacket" }] } }];
  for (const metadata of [{}, { action: "select", productId: "jacket123", quickReplyPayload: null }]) {
    const memory = getMemory(history, "ei beche nilam", metadata);
    assert.equal(memory.selectedProductId, "jacket123");
    assert.equal(memory.newProductSearch, false);
    assert.equal(memory.explicitSelection, true);
  }
});

test("another subscribed app cannot hide missing callbacks on our app", async () => {
  const writes = [];
  const result = await ensureMessengerPostbacks({ graphApiVersion: "v23.0", messengerPageId: "page", messengerPageAccessToken: "fixture" }, {
    force: true, fetchImpl: async (url, options) => {
      if (options.method === "POST") { writes.push(JSON.parse(options.body)); return Response.json({ success: true }); }
      if (url.includes("/app?")) return Response.json({ id: "ours" });
      return Response.json({ data: [{ id: "other", subscribed_fields: ["messages", "messaging_postbacks"] }, { id: "ours", subscribed_fields: ["messages", "message_reads"] }] });
    },
  });
  assert.equal(result.ready, true);
  assert.deepEqual(writes[0].subscribed_fields, ["messages", "message_reads", "messaging_postbacks"]);
});

test("receipt uses Messenger link buttons and uploads real image bytes", async (t) => {
  const { buildChatTextRequest, sendChatChannelImageMessage } = await loadFunctions("./chatChannelTextAdapter.js", ["buildChatTextRequest", "sendChatChannelImageMessage"], { sharp });
  const conversation = { channel: "MESSENGER", externalUserId: "customer" };
  const credentials = { graphApiVersion: "v23.0", messengerPageId: "page", messengerPageAccessToken: "fixture" };
  const request = buildChatTextRequest(conversation, "Order confirmed", credentials, null, [], [
    { title: "View invoice", url: "https://shop.example/invoice" }, { title: "Track order", url: "https://shop.example/track" },
  ]);
  assert.equal(request.body.message.attachment.payload.template_type, "button");
  assert.deepEqual(request.body.message.attachment.payload.buttons.map((button) => button.type), ["web_url", "web_url"]);
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.ok(options.body instanceof FormData);
    assert.equal(options.body.get("filedata").type, "image/jpeg");
    assert.equal(options.headers["Content-Type"], undefined);
    return Response.json({ message_id: "uploaded" });
  });
  const bytes = await sharp({ create: { width: 20, height: 20, channels: 3, background: "orange" } }).png().toBuffer();
  const result = await sendChatChannelImageMessage(conversation, "", "https://shop.example/card", credentials, null, null, bytes);
  assert.equal(result.id, "uploaded");
});

test("confirmation card renders multiple products, escaped names and variant photos", async (t) => {
  const { renderChatOrderCard } = await loadFunctions("./chatOrderCardService.js", ["renderChatOrderCard"], { sharp });
  const photo = await sharp({ create: { width: 20, height: 20, channels: 3, background: "orange" } }).png().toBuffer();
  const requested = [];
  t.mock.method(globalThis, "fetch", async (url) => { requested.push(String(url)); return new Response(photo, { headers: { "Content-Type": "image/png" } }); });
  const item = { productName: "Jacket & Coat <Yellow>", productCode: "1003", price: 2000, quantity: 1, combinations: "[]", variation: { thumbnail: { url: "https://shop.example/yellow.png" } }, product: null };
  const bytes = await renderChatOrderCard({ orderNo: "DEMO-123", deliveryCharge: 120, dueAmount: 4020, paidAmount: 100, orderItems: [item, item] }, "https://shop.example");
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 900);
  assert.equal(metadata.height, 1080);
  assert.equal(requested.length, 2);
});

test("verified invoice remains viewable when Chromium fails; wrong phone stays denied", async (t) => {
  t.mock.method(console, "error", () => {});
  const { GET } = await loadFunctions("../../app/api/pdf/invoice/route.js", ["GET"], {
    prisma: { order: { findUnique: async () => ({ orderNo: "123", phoneNumber: "01712345678" }) } },
    getInvoicePDF: async () => { throw new Error("Chromium binary unavailable"); },
    getInvoiceTemplate: async () => "<html><body>Verified invoice</body></html>", NextResponse: Response,
  });
  const denied = await GET(new Request("https://shop.example/api/pdf/invoice?o=123&p=01912345678"));
  assert.equal(denied.status, 404);
  const allowed = await GET(new Request("https://shop.example/api/pdf/invoice?o=123&p=01712345678"));
  assert.equal(allowed.status, 200);
  assert.match(allowed.headers.get("content-type"), /text\/html/);
  assert.match(await allowed.text(), /Print \/ Save PDF/);
});
