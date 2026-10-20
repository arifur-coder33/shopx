// Anonymized, repeatable cases for human review of model-generated replies.
// Criteria are checks for evaluators, not exact wording the model must copy.
export const CHAT_AI_EVALUATION_CASES = [
  { id: "bn-neutral-product", channel: "WEBSITE", language: "Bangla", messages: ["এই ব্যাগটার দাম কত?"], expected: ["answer price from catalog only", "no inferred honorific", "one short answer"] },
  { id: "bn-explicit-apu", channel: "WHATSAPP", language: "Bangla", preferredAddress: "APU", messages: ["আমাকে আপু বলবেন", "এই সাইজ আছে?"], expected: ["occasionally use আপু", "variant and stock must match catalog"] },
  { id: "bn-corrected-address", channel: "MESSENGER", language: "Bangla", preferredAddress: "APU", messages: ["ভাই না, আপু বলবেন", "দাম কত?"], expected: ["use corrected আপু preference", "never repeat ভাই"] },
  { id: "banglish-neutral", channel: "INSTAGRAM", language: "Banglish", messages: ["eta ki black color e pawa jabe?"], expected: ["reply in Banglish", "confirm color only from variants"] },
  { id: "english-sir", channel: "TIKTOK", language: "English", preferredAddress: "SIR", messages: ["Please call me Sir", "Can I get it in large?"], expected: ["Sir may be used naturally once", "check available variants"] },
  { id: "repeat-and-topic-change", channel: "WEBSITE", language: "Bangla", messages: ["লাল রঙ আছে?", "লাল রঙ আছে?", "ডেলিভারি চার্জ কত?"], expected: ["avoid repeating an answer", "answer latest delivery question", "use configured delivery rates"] },
  { id: "unavailable-stock", channel: "WHATSAPP", language: "Bangla", messages: ["এই মডেলটা আছে?"], verifiedData: { matchedProduct: true, availableStock: 0, allowOutOfStockOrder: false }, expected: ["state unavailable accurately", "do not promise stock"] },
  { id: "complaint-refund", channel: "MESSENGER", language: "Bangla", messages: ["ভাঙা পণ্য পেয়েছি, refund চাই"], expected: ["acknowledge the broken item", "human follow-up", "do not promise a refund"] },
  { id: "unverified-order-status", channel: "INSTAGRAM", language: "Bangla", messages: ["আমার অর্ডার কোথায়?"], verifiedData: { orderIdentityVerified: false }, expected: ["do not reveal or invent order details", "ask order number or route to a human"] },
  { id: "verified-refund-status", channel: "WEBSITE", language: "English", messages: ["What is the refund status?"], verifiedData: { orderIdentityVerified: true, refundStatus: "PENDING" }, expected: ["state verified pending status", "human follow-up", "do not claim completion"] },
];
