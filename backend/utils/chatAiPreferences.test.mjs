import test from "node:test";
import assert from "node:assert/strict";
import { compactConversationHistory, customerRequiresHumanFollowUp, explicitAddressPreference, hasInboundImage, isDeliveryQuestion, isProductImageRequest, isProductQuestion, needsHumanFollowUp, selectRelevantAiReplyExamples, shouldAutoReply } from "./chatAiPreferences.mjs";

test("stores only explicit address preferences, including corrections", () => {
  assert.equal(explicitAddressPreference("আমাকে আপু বলবেন"), "APU");
  assert.equal(explicitAddressPreference("ভাই না, আপু বলে ডাকবেন"), "APU");
  assert.equal(explicitAddressPreference("Please call me Sir"), "SIR");
  assert.equal(explicitAddressPreference("Please call me Madam"), "MADAM");
  assert.equal(explicitAddressPreference("Don't call me madam"), "NEUTRAL");
  assert.equal(explicitAddressPreference("আমাকে আপু বলবেন না"), "NEUTRAL");
  assert.equal(explicitAddressPreference("আমাকে ভাই বলবেন, Sir না"), "BHAI");
});

test("does not infer a preference from names, language, or reciprocal address", () => {
  assert.equal(explicitAddressPreference("আমার নাম স্যার আলী"), null);
  assert.equal(explicitAddressPreference("ভাই, এই পণ্যের দাম কত?"), null);
  assert.equal(explicitAddressPreference("Hi, how much is this?"), null);
  assert.equal(explicitAddressPreference("আমি একজন নারী"), null);
});

test("keeps a bounded recent history and summarizes older messages", () => {
  const messages = Array.from({ length: 24 }, (_, index) => ({ direction: index % 2 ? "OUTBOUND" : "INBOUND", content: `message ${index}`, deliveryStatus: "SENT" }));
  const context = compactConversationHistory(messages, { recentLimit: 12, summaryLimit: 8 });
  assert.equal(context.length, 13);
  assert.match(context[0].content, /message 4/);
  assert.equal(context.at(-1).content, "message 23");
});

test("redacts contact and address details from model history", () => {
  const context = compactConversationHistory([{ direction: "INBOUND", content: "phone 01700000000 email customer@example.com address: House 1, Dhaka", deliveryStatus: "DELIVERED" }]);
  assert.doesNotMatch(context[0].content, /01700000000|customer@example.com|House 1/);
  assert.match(context[0].content, /\[phone\]/);
  assert.match(context[0].content, /\[email\]/);
  assert.match(context[0].content, /\[address\]/);
});

test("flags complaint and refund cases for human follow-up", () => {
  assert.equal(customerRequiresHumanFollowUp("আমার রিফান্ড কোথায়?"), true);
  assert.equal(customerRequiresHumanFollowUp("The item arrived damaged"), true);
  assert.equal(customerRequiresHumanFollowUp("কালারটা কী?"), false);
});

test("only fetches business facts when the customer asks for product or delivery details", () => {
  assert.equal(isProductQuestion("এটার দাম কত?"), true);
  assert.equal(isProductQuestion("এই রং আছে?"), true);
  assert.equal(isProductQuestion("Hello"), false);
  assert.equal(isDeliveryQuestion("ঢাকায় delivery charge কত?"), true);
  assert.equal(isDeliveryQuestion("Hi"), false);
});

test("recognizes explicit requests for a product photo and inbound image attachments", () => {
  assert.equal(isProductImageRequest("ei black bag er photo den"), true);
  assert.equal(isProductImageRequest("ei bag er chobi den"), true);
  assert.equal(isProductImageRequest("এই পণ্যের ছবি দেখান"), true);
  assert.equal(isProductImageRequest("How much is it?"), false);
  assert.equal(hasInboundImage({ image: { mediaId: "media-id" } }), true);
  assert.equal(hasInboundImage({ attachments: [{ type: "image", payload: { url: "https://cdn.example/photo.jpg" } }] }), true);
  assert.equal(hasInboundImage({ attachments: [{ type: "file", payload: { url: "https://cdn.example/file.pdf" } }] }), false);
});

test("selects only relevant saved answer examples for the current customer question", () => {
  const examples = [
    { question: "delivery charge koto?", answer: "Delivery charge location onujayi hoy." },
    { question: "refund kobe pabo?", answer: "Team status check kore janabe." },
  ];
  assert.deepEqual(selectRelevantAiReplyExamples(examples, "delivery charge koto Dhakay?"), [examples[0]]);
  assert.deepEqual(selectRelevantAiReplyExamples(examples, "eta ki color e ache?"), []);
});

test("requires verified order context or human follow-up for account requests", () => {
  assert.equal(needsHumanFollowUp({ messageText: "আমার order status কী?", hasVerifiedOrder: false }), true);
  assert.equal(needsHumanFollowUp({ messageText: "আমার order status কী?", hasVerifiedOrder: true }), false);
});

test("global off, closed chats, assignments, and paused chats suppress AI", () => {
  const inbound = { direction: "INBOUND", authorType: "CUSTOMER" };
  assert.equal(shouldAutoReply({ globalEnabled: true, conversation: { status: "OPEN", aiModeEnabled: true, assignedToId: null }, inbound }), true);
  assert.equal(shouldAutoReply({ globalEnabled: false, conversation: { status: "OPEN", aiModeEnabled: true }, inbound }), false);
  assert.equal(shouldAutoReply({ globalEnabled: true, conversation: { status: "OPEN", aiModeEnabled: false }, inbound }), false);
  assert.equal(shouldAutoReply({ globalEnabled: true, conversation: { status: "CLOSED", aiModeEnabled: true }, inbound }), false);
  assert.equal(shouldAutoReply({ globalEnabled: true, conversation: { status: "OPEN", aiModeEnabled: true, assignedToId: "agent" }, inbound }), false);
});

test("supports every configured channel tone", async () => {
  const { CHAT_AI_CHANNEL_TONE } = await import("../services/chatAiPrompt.js");
  for (const channel of ["WEBSITE", "WHATSAPP", "MESSENGER", "INSTAGRAM", "TIKTOK"]) assert.ok(CHAT_AI_CHANNEL_TONE[channel]);
});

test("builds text replies through each existing channel adapter with safe length limits", async () => {
  const { buildChatTextRequest } = await import("../services/chatChannelTextAdapter.js");
  const message = "x".repeat(900);
  const metaBase = { graphApiVersion: "v23.0", whatsappPhoneNumberId: "wa-page", whatsappAccessToken: "token", messengerPageId: "page", messengerPageAccessToken: "token", instagramAccountId: "ig", instagramAccessToken: "token" };
  assert.equal(buildChatTextRequest({ channel: "WEBSITE", externalUserId: "session" }, message, {}), null);
  const whatsapp = buildChatTextRequest({ channel: "WHATSAPP", externalUserId: "8801700000000" }, message, metaBase, "quoted");
  assert.equal(whatsapp.body.text.body.length, 700);
  assert.equal(whatsapp.body.context.message_id, "quoted");
  assert.ok(buildChatTextRequest({ channel: "MESSENGER", externalUserId: "psid" }, "hi", metaBase).url.includes("/page/messages"));
  assert.ok(buildChatTextRequest({ channel: "INSTAGRAM", externalUserId: "igsid" }, "hi", metaBase).url.includes("/ig/messages"));
  const tiktok = buildChatTextRequest({ channel: "TIKTOK", externalUserId: "conversation" }, "hi", { tiktokBusinessId: "business", tiktokAccessToken: "token" });
  assert.equal(tiktok.body.recipient, "conversation");
});
