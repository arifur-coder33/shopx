import test from "node:test";
import assert from "node:assert/strict";
import { messengerReactionPayload, messengerReaction } from "./chatMessengerReaction.mjs";

test("Messenger receives Unicode emoji rather than Facebook reaction names", () => {
  for (const emoji of ["👍", "❤️", "😂", "😮", "😢", "😡"]) {
    assert.deepEqual(messengerReactionPayload("customer", "mid", emoji), {
      recipient: { id: "customer" }, sender_action: "react", payload: { message_id: "mid", reaction: emoji },
    });
  }
  assert.equal(messengerReaction("❤").emoji, "❤️");
});

test("unreact contains only the message ID, and unsupported input is rejected", () => {
  assert.deepEqual(messengerReactionPayload("customer", "mid", "❤️", true), {
    recipient: { id: "customer" }, sender_action: "unreact", payload: { message_id: "mid" },
  });
  assert.throws(() => messengerReactionPayload("customer", "mid", "love"));
});
