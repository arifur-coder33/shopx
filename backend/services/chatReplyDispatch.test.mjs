import test from "node:test";
import assert from "node:assert/strict";
import { dispatchChatReply } from "./chatReplyDispatch.mjs";

function context(payload = null, flow = null) {
  const calls = [];
  const inbound = { id: "click", conversationId: "conversation", direction: "INBOUND", authorType: "CUSTOMER", metadata: { quickReplyPayload: payload } };
  return {
    calls,
    inbound,
    options: {
      conversationId: "conversation", inboundMessageId: inbound.id,
      db: { chatMessage: {
        findUnique: async () => inbound,
        findFirst: async () => flow ? { metadata: { chatOrderFlow: flow } } : null,
      } },
      reply: async (id) => { calls.push(["reply", id]); },
      batch: async () => { calls.push(["batch"]); },
    },
  };
}

for (const action of ["select:product123", "order:product123", "checkout:11111111-1111-1111-1111-111111111111:22222222-2222-2222-2222-222222222222:place"]) {
  test(`${action.split(":")[0]} button waits for related follow-up messages`, async () => {
    const { options, calls } = context(action);
    await dispatchChatReply(options);
    assert.deepEqual(calls, [["batch"]]);
  });
}

test("customer name and phone during checkout use the shared batch worker", async () => {
  const { options, calls } = context(null, { step: "name", productId: "product123" });
  await dispatchChatReply(options);
  assert.deepEqual(calls, [["batch"]]);
});

test("ordinary conversation after a completed checkout keeps normal batching", async () => {
  const { options, calls } = context(null, { step: "done" });
  await dispatchChatReply(options);
  assert.deepEqual(calls, [["batch"]]);
});

test("ordinary text retains batching and its latest-message callback", async () => {
  const { options, calls } = context();
  options.batch = async (conversationId, reply) => {
    assert.equal(conversationId, "conversation");
    await reply("newest-message");
  };
  await dispatchChatReply(options);
  assert.deepEqual(calls, [["reply", "newest-message"]]);
});

test("outbound messages and another conversation cannot trigger replies", async () => {
  for (const change of [{ direction: "OUTBOUND" }, { conversationId: "another" }, { authorType: "AGENT" }]) {
    const { options, calls, inbound } = context("order:product123");
    Object.assign(inbound, change);
    await dispatchChatReply(options);
    assert.deepEqual(calls, []);
  }
});
