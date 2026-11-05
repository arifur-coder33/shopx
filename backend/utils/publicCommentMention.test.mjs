import test from "node:test";
import assert from "node:assert/strict";
import { publicCommentReplyText } from "./publicCommentMention.mjs";

test("Facebook replies include the webhook author ID once, preserving the answer", () => {
  const input = { platform: "FACEBOOK", authorId: "123456789012345", reply: "হ্যালো!" };
  assert.equal(publicCommentReplyText(input), "@[123456789012345] হ্যালো!");
  assert.equal(publicCommentReplyText({ ...input, reply: "@[123456789012345] হ্যালো!" }), "@[123456789012345] হ্যালো!");
});

test("Facebook never substitutes display names or malformed IDs for an author ID", () => {
  for (const authorId of [null, "", "Jane Doe", "123] @other", "0"]) {
    assert.equal(publicCommentReplyText({ platform: "FACEBOOK", authorId, authorUsername: "jane", reply: "Thanks" }), "Thanks");
  }
  assert.equal(publicCommentReplyText({ platform: "FACEBOOK", authorId: "123", reply: " " }), "");
});

test("Instagram replies address the webhook username, preserving the AI answer", () => {
  assert.equal(publicCommentReplyText({ platform: "INSTAGRAM", authorUsername: "shopper.12", reply: "ধন্যবাদ!" }), "@shopper.12 ধন্যবাদ!");
});

test("missing, invalid or display names never become fabricated mentions", () => {
  for (const authorUsername of [null, "Jane Doe", "name @someone", "x".repeat(31)]) {
    assert.equal(publicCommentReplyText({ platform: "INSTAGRAM", authorUsername, reply: "Thanks" }), "Thanks");
  }
  assert.equal(publicCommentReplyText({ platform: "FACEBOOK", authorUsername: "Jane", reply: "Thanks" }), "Thanks");
});

test("existing exact mentions are not doubled; longer usernames do not match", () => {
  assert.equal(publicCommentReplyText({ platform: "INSTAGRAM", authorUsername: "jane", reply: "@Jane Thanks" }), "@Jane Thanks");
  assert.equal(publicCommentReplyText({ platform: "INSTAGRAM", authorUsername: "jane", reply: "@janet Thanks" }), "@jane @janet Thanks");
});
