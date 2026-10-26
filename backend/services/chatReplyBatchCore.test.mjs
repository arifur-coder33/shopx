import test from "node:test";
import assert from "node:assert/strict";
import { runReplyBatch, newerInboundWhere, mergeInboundBatch } from "./chatReplyBatchCore.mjs";

const message = (id, milliseconds = 0, content = id, metadata = {}) => ({ id, conversationId: "chat", createdAt: new Date(milliseconds), content, metadata });

function fixture({ busyClaims = 0, existing = null } = {}) {
  let time = 0;
  const state = { messages: [message("a")], replies: new Map(existing ? [["a", existing]] : []), claims: 0, updates: [], sleeps: [], released: false };
  const db = {
    chatConversation: { updateMany: async ({ where, data }) => {
      if (data.aiReplyLeaseToken === null) { state.released = true; return { count: 1 }; }
      if (where.OR) { state.claims++; if (busyClaims-- > 0) return { count: 0 }; }
      return { count: 1 };
    } },
    chatMessage: {
      findUnique: async ({ where }) => state.replies.get(where.aiReplyForMessageId) || null,
      update: async ({ where, data }) => {
        state.updates.push({ where, data });
        for (const [id, row] of state.replies) if (row.id === where.id) state.replies.delete(id);
      },
      findFirst: async ({ where, orderBy }) => {
        if (orderBy) return state.messages.at(-1);
        const [later, tie] = where.OR;
        return state.messages.find((item) => item.createdAt > later.createdAt.gt || (+item.createdAt === +tie.createdAt && item.id > tie.id.gt)) || null;
      },
    },
  };
  const options = { now: () => time, sleep: async (ms) => { state.sleeps.push(ms); time += ms; await state.onSleep?.(ms); } };
  return { db, state, options };
}

test("a follow-up during the quiet window resets it and only the latest message is answered", async () => {
  const { db, state, options } = fixture();
  state.onSleep = () => { if (state.messages.length === 1) state.messages.push(message("b", 2000)); };
  const replies = [];
  await runReplyBatch(db, "chat", async (id) => replies.push(id), options);
  assert.deepEqual(replies, ["b"]);
  assert.deepEqual(state.sleeps, [4000, 2000]);
  assert.equal(state.released, true);
});

test("a busy worker does not discard a wake-up for unanswered customer input", async () => {
  const { db, state, options } = fixture({ busyClaims: 1 });
  const replies = [];
  await runReplyBatch(db, "chat", async (id) => replies.push(id), options);
  assert.deepEqual(replies, ["a"]);
  assert.equal(state.claims, 2);
});

test("new input during generation replaces the draft, including equal timestamps", async () => {
  const { db, state, options } = fixture();
  const drafts = [], delivered = [];
  await runReplyBatch(db, "chat", async (id) => {
    drafts.push(id);
    if (id === "a") state.messages.push(message("b"));
    const inbound = state.messages.find((item) => item.id === id);
    if (!await db.chatMessage.findFirst({ where: newerInboundWhere(inbound) })) delivered.push(id);
  }, options);
  assert.deepEqual(drafts, ["a", "b"]);
  assert.deepEqual(delivered, ["b"]);
});

test("an interrupted worker's SENDING placeholder is reclaimed, but sent replies stay deduplicated", async () => {
  for (const deliveryStatus of ["SENDING", "SENT"]) {
    const { db, state, options } = fixture({ existing: { id: "placeholder", deliveryStatus } });
    const replies = [];
    await runReplyBatch(db, "chat", async (id) => replies.push(id), options);
    assert.deepEqual(replies, deliveryStatus === "SENDING" ? ["a"] : []);
    assert.equal(state.updates.length, deliveryStatus === "SENDING" ? 1 : 0);
  }
});

test("a worker failure releases its lease for subsequent customer messages", async () => {
  const { db, state, options } = fixture();
  await assert.rejects(runReplyBatch(db, "chat", async () => { throw new Error("provider offline"); }, options), /provider offline/u);
  assert.equal(state.released, true);
});

test("multiple related questions/corrections are supplied once in chronological order", () => {
  const messages = [message("a", 0, "fan ache?"), message("b", 1000, "dam koto?"), message("c", 2000, "mini fan bolchi")];
  const combined = mergeInboundBatch(messages, messages.at(-1));
  assert.equal(combined.content, "fan ache?\ndam koto?\nmini fan bolchi");
  assert.deepEqual(combined.metadata.batchedMessageIds, ["a", "b", "c"]);
});

test("a later written correction cannot silently execute an earlier checkout button", () => {
  const messages = [message("a", 0, "Place order", { quickReplyPayload: "checkout:flow:version:place" }), message("b", 1000, "cancel")];
  const combined = mergeInboundBatch(messages, messages.at(-1));
  assert.equal(combined.metadata.quickReplyPayload, null);
  assert.equal(combined.metadata.batchedLatestText, "cancel");
});
