import test from "node:test";
import assert from "node:assert/strict";
import { whatsAppImageContent, whatsAppSelectedProduct, whatsAppUrlButtonContent } from "./chatProductSelection.mjs";

test("a WhatsApp card carries its photo and product-specific selection button", () => {
  const payload = whatsAppImageContent("uploaded-media", "Fan · ৳850", "product123");
  assert.equal(payload.type, "interactive");
  assert.equal(payload.interactive.header.image.id, "uploaded-media");
  const reply = payload.interactive.action.buttons[0].reply;
  assert.equal(reply.title, "এটি বেছে নিন");
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

test("a purchase URL stays behind the WhatsApp CTA button", () => {
  const url = "https://shop.example/buynow/portable-fan";
  const payload = whatsAppUrlButtonContent("আপনি Portable fan বেছে নিয়েছেন।", { title: "ওয়েবসাইটে কিনুন", url });
  assert.equal(payload.interactive.type, "cta_url");
  assert.equal(payload.interactive.action.name, "cta_url");
  assert.deepEqual(payload.interactive.action.parameters, { display_text: "ওয়েবসাইটে কিনুন", url });
  assert.equal(payload.interactive.body.text.includes(url), false);
});

test("WhatsApp URL buttons reject unsafe link schemes", () => {
  for (const url of ["http://shop.example/product", "javascript:alert(1)", "invalid-url"]) {
    assert.throws(() => whatsAppUrlButtonContent("পণ্যের তথ্য", { title: "পণ্য দেখুন", url }));
  }
});
