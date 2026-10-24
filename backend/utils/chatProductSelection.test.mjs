import test from "node:test";
import assert from "node:assert/strict";
import { whatsAppImageContent, whatsAppSelectedProduct } from "./chatProductSelection.mjs";

test("a WhatsApp card carries its photo and product-specific selection button", () => {
  const payload = whatsAppImageContent("uploaded-media", "Fan · ৳850", "product123");
  assert.equal(payload.type, "interactive");
  assert.equal(payload.interactive.header.image.id, "uploaded-media");
  const reply = payload.interactive.action.buttons[0].reply;
  assert.equal(reply.title, "Select this product");
  assert.equal(whatsAppSelectedProduct({ interactive: { button_reply: reply } }), "product123");
});

test("ordinary photos are still image messages", () => {
  assert.deepEqual(whatsAppImageContent("media", "Photo"), { type: "image", image: { id: "media", caption: "Photo" } });
});

test("selection decoding rejects malformed and unrelated button payloads", () => {
  for (const id of ["details:product123", "select:../private", "select:", "select:" + "a".repeat(81)]) {
    assert.equal(whatsAppSelectedProduct({ interactive: { button_reply: { id } } }), null);
  }
});
