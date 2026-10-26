import test from "node:test";
import assert from "node:assert/strict";
import { ensureMessengerPostbacks } from "./chatMessengerSubscriptions.mjs";

const credentials = { graphApiVersion: "v23.0", messengerPageId: "test-page", messengerPageAccessToken: "test-token" };
const response = (data, ok = true) => ({ ok, status: ok ? 200 : 403, json: async () => data });

test("adding Messenger card callbacks preserves existing Page subscription fields", async () => {
  const calls = [];
  const result = await ensureMessengerPostbacks(credentials, { force: true, fetchImpl: async (url, options) => {
    calls.push({ url, ...options });
    return calls.length === 1 ? response({ data: [{ id: "app", subscribed_fields: ["messages", "message_reads", "feed"] }] }) : response({ success: true });
  } });
  assert.equal(result.ready, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, "POST");
  assert.deepEqual(JSON.parse(calls[1].body).subscribed_fields, ["messages", "message_reads", "feed", "messaging_postbacks"]);
});

test("an already subscribed Page needs no subscription write", async () => {
  let count = 0;
  const result = await ensureMessengerPostbacks(credentials, { force: true, fetchImpl: async () => {
    count += 1;
    return response({ data: [{ subscribed_fields: ["messages", "messaging_postbacks"] }] });
  } });
  assert.equal(result.ready, true);
  assert.equal(count, 1);
});

test("a missing Page subscription registers both message and card events", async () => {
  const writes = [];
  const result = await ensureMessengerPostbacks(credentials, { force: true, fetchImpl: async (_url, options) => {
    if (!options.method) return response({ data: [] });
    writes.push(JSON.parse(options.body));
    return response({ success: true });
  } });
  assert.equal(result.ready, true);
  assert.deepEqual(writes, [{ subscribed_fields: ["messages", "messaging_postbacks"] }]);
});

test("a denied subscription returns an actionable warning without breaking product delivery", async (t) => {
  t.mock.method(console, "warn", () => {});
  const result = await ensureMessengerPostbacks(credentials, { force: true, fetchImpl: async () => response({ error: { code: 200 } }, false) });
  assert.equal(result.ready, false);
  assert.match(result.warning, /messaging_postbacks/u);
});
