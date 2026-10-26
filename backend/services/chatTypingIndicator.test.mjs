import test from "node:test";
import assert from "node:assert/strict";
import { buildChatTypingRequest, startChatTypingIndicator } from "./chatTypingIndicator.mjs";

const credentials = {
  graphApiVersion: "v26.0", messengerPageId: "page", messengerPageAccessToken: "test-page-token",
  whatsappPhoneNumberId: "phone", whatsappAccessToken: "test-wa-token",
  instagramAccountId: "instagram", instagramAccessToken: "test-ig-token",
};
const inbound = { externalMessageId: "wamid.customer-message" };
const conversation = (channel = "MESSENGER") => ({ channel, externalUserId: "customer" });
const settle = () => new Promise((resolve) => setImmediate(resolve));

function fixture(overrides = {}) {
  const calls = [], warnings = [];
  let tick, cleared = 0;
  return {
    calls, warnings,
    tick: () => tick(),
    cleared: () => cleared,
    options: {
      fetchImpl: async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return { ok: true }; },
      schedule: (callback, interval) => { assert.equal(interval, 10000); tick = callback; return 1; },
      unschedule: () => { cleared++; },
      warn: (...args) => warnings.push(args),
      ...overrides,
    },
  };
}

test("Messenger typing is refreshed during generation and stopped when the reply completes", async () => {
  const f = fixture();
  const stop = startChatTypingIndicator(conversation(), inbound, credentials, f.options);
  await settle();
  f.tick();
  await settle();
  await stop();
  assert.deepEqual(f.calls.map(({ body }) => body.sender_action), ["typing_on", "typing_on", "typing_off"]);
  assert.equal(f.calls[0].url, "https://graph.facebook.com/v26.0/page/messages");
  assert.deepEqual(f.calls[0].body.recipient, { id: "customer" });
  assert.ok(f.cleared());
});

test("WhatsApp attaches typing to the customer's actual inbound message and has no invented off request", async () => {
  const f = fixture();
  const stop = startChatTypingIndicator(conversation("WHATSAPP"), inbound, credentials, f.options);
  await settle();
  await stop();
  assert.deepEqual(f.calls[0].body, { messaging_product: "whatsapp", status: "read", message_id: inbound.externalMessageId, typing_indicator: { type: "text" } });
  assert.equal(f.calls.length, 1);
  assert.equal(buildChatTypingRequest(conversation("WHATSAPP"), {}, credentials), null);
});

test("cleanup waits for an in-flight typing_on before sending typing_off", async () => {
  const actions = [];
  let finishOn;
  const f = fixture({ fetchImpl: async (_url, options) => {
    const { sender_action: action } = JSON.parse(options.body);
    actions.push(action);
    if (action === "typing_on") await new Promise((resolve) => { finishOn = resolve; });
    return { ok: true };
  } });
  const stop = startChatTypingIndicator(conversation(), inbound, credentials, f.options);
  await settle();
  const finished = stop();
  assert.deepEqual(actions, ["typing_on"]);
  finishOn();
  await finished;
  assert.deepEqual(actions, ["typing_on", "typing_off"]);
});

test("provider rejection stops indicator retries without rejecting the chat's cleanup", async () => {
  const f = fixture({ fetchImpl: async () => ({ ok: false, status: 403 }) });
  const stop = startChatTypingIndicator(conversation(), inbound, credentials, f.options);
  await settle();
  f.tick();
  await stop();
  assert.equal(f.warnings.length, 1);
  assert.ok(f.cleared());
});

test("human takeover stops native typing and later refreshes cannot turn it back on", async () => {
  let active = true;
  const f = fixture({ isActive: async () => active });
  const stop = startChatTypingIndicator(conversation(), inbound, credentials, f.options);
  await settle();
  active = false;
  f.tick();
  await settle();
  f.tick();
  await stop();
  assert.deepEqual(f.calls.map(({ body }) => body.sender_action), ["typing_on", "typing_off"]);
});

test("website uses its reply placeholder, and missing credentials never send a provider request", async () => {
  const f = fixture();
  await startChatTypingIndicator(conversation("WEBSITE"), inbound, credentials, f.options)();
  await startChatTypingIndicator(conversation(), inbound, {}, f.options)();
  assert.equal(f.calls.length, 0);
  assert.equal(f.cleared(), 0);
  assert.equal(buildChatTypingRequest(conversation("INSTAGRAM"), inbound, credentials).body.sender_action, "typing_on");
});
