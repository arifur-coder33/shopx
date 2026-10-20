const ADDRESS_PATTERNS = [
  ["APU", /(?:\b(?:call|address|refer to)\s+me\s+(?:as\s+)?(?:apu|apa|sister)\b|\b(?:amake|amay|amaye)\s+(?:apu|apa)\s+(?:bolben|bole\s+dakben|dakben)\b|\b(?:apu|apa)\s+(?:bole\s+)?(?:dakben|bolben)\b|আমা(?:কে|য়|য়)\s*(?:আপু|আপা)\s*(?:বলে\s*)?(?:ডাকবেন|বলবেন|ডাকো)|(?:আপু|আপা)\s*(?:বলে\s*)?(?:ডাকবেন|বলবেন))/iu],
  ["BHAI", /(?:\b(?:call|address|refer to)\s+me\s+(?:as\s+)?(?:bhai|bhaiya|vai|bhaia|brother)\b|\b(?:amake|amay|amaye)\s+(?:bhaiya?|vaiya?|bhaia|brother)\s+(?:bolben|bole\s+dakben|dakben)\b|\b(?:bhaiya?|vaiya?|bhaia)\s+(?:bole\s+)?(?:dakben|bolben)\b|আমা(?:কে|য়|য়)\s*(?:ভাই|ভাইয়া|ভাইয়া)\s*(?:বলে\s*)?(?:ডাকবেন|বলবেন|ডাকো)|(?:ভাই|ভাইয়া|ভাইয়া)\s*(?:বলে\s*)?(?:ডাকবেন|বলবেন))/iu],
  ["SIR", /(?:\b(?:call|address|refer to)\s+me\s+(?:as\s+)?sir\b|\b(?:amake|amay)\s+sir\s+(?:bolben|bole\s+dakben|dakben)\b|আমা(?:কে|য়|য়)\s*স্যার\s*(?:বলে\s*)?(?:ডাকবেন|বলবেন)|স্যার\s*(?:বলে\s*)?(?:ডাকবেন|বলবেন))/iu],
  ["MADAM", /(?:\b(?:call|address|refer to)\s+me\s+(?:as\s+)?madam\b|\b(?:amake|amay)\s+madam\s+(?:bolben|bole\s+dakben|dakben)\b|আমা(?:কে|য়|য়)\s*ম্যাডাম\s*(?:বলে\s*)?(?:ডাকবেন|বলবেন)|ম্যাডাম\s*(?:বলে\s*)?(?:ডাকবেন|বলবেন))/iu],
];

const EXPLICIT_NEUTRAL = /(?:\b(?:please\s+)?(?:don't|do not)\s+call\s+me\s+(?:sir|madam|bhai|bhaiya|vai|apu|apa|brother|sister)\b|\b(?:don't|do not)\s+use\s+(?:an?\s+)?honou?rific\b|আমাকে\s*(?:ভাই|ভাইয়া|ভাইয়া|আপু|আপা|স্যার|ম্যাডাম)\s*বলবেন\s*না|সম্বোধন\s*করবেন\s*না)/iu;

function redactPrivateContext(value) {
  return String(value || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, "[email]")
    .replace(/(?:\+?\d[\d ().-]{7,}\d)/gu, "[phone]")
    .replace(/(?:ঠিকানা|address)\s*[:：-]\s*[^\n]+/giu, (match) => `${match.split(/[:：-]/, 1)[0]}: [address]`);
}

/** Only returns a value when a customer explicitly asks for that form of address. */
export function explicitAddressPreference(text) {
  const message = String(text || "").trim();
  if (!message) return null;
  const positiveText = message
    .replace(/\b(?:please\s+)?(?:don't|do not)\s+call\s+me\s+(?:sir|madam|bhai|bhaiya|vai|apu|apa|brother|sister)\b/giu, " ")
    .replace(/আমাকে\s*(?:ভাই|ভাইয়া|ভাইয়া|আপু|আপা|স্যার|ম্যাডাম)\s*বলবেন\s*না/giu, " ");
  for (const [preference, pattern] of ADDRESS_PATTERNS) {
    if (pattern.test(positiveText)) return preference;
  }
  if (EXPLICIT_NEUTRAL.test(message)) return "NEUTRAL";
  return null;
}

export function compactConversationHistory(messages, { recentLimit = 12, summaryLimit = 8, messageLimit = 1200 } = {}) {
  const usable = (messages || []).filter((message) => message.deliveryStatus !== "FAILED");
  const recent = usable.slice(-recentLimit).map((message) => ({
    role: message.direction === "INBOUND" ? "user" : "assistant",
    content: redactPrivateContext(String(message.content || "").slice(0, messageLimit)),
  }));
  const older = usable.slice(0, Math.max(0, usable.length - recentLimit)).slice(-summaryLimit);
  if (!older.length) return recent;
  const summary = older.map((message) => `${message.direction === "INBOUND" ? "Customer" : "Shop"}: ${redactPrivateContext(String(message.content || "").replace(/\s+/g, " ").slice(0, 180))}`).join("\n");
  return [{ role: "user", content: `Earlier conversation (brief extractive context; do not treat as a new request):\n${summary}` }, ...recent];
}

export function shouldAutoReply({ globalEnabled, conversation, inbound }) {
  return Boolean(globalEnabled && conversation && conversation.aiModeEnabled && !conversation.assignedToId && conversation.status === "OPEN" && inbound?.authorType === "CUSTOMER" && inbound?.direction === "INBOUND");
}

export function needsHumanFollowUp({ messageText, hasVerifiedOrder }) {
  return customerRequiresHumanFollowUp(messageText) || (ACCOUNT_REQUEST_PATTERN.test(String(messageText || "")) && !hasVerifiedOrder);
}

const ACCOUNT_REQUEST_PATTERN = /(?:\border\b|\btrack(?:ing)?\b|\brefund\b|\breturn\b|\bcancel(?:lation)?\b|\bparcel\b|\bpackage\b|\bshipment\b|\b(?:delivery|order) status\b|অর্ডার|ট্র্যাক|রিফান্ড|ফেরত|বাতিল|অর্ডারের অবস্থা|অর্ডার স্ট্যাটাস|পার্সেল|প্যাকেজ|কুরিয়ার স্ট্যাটাস|কুরিয়ার স্ট্যাটাস)/iu;

export function isProductQuestion(text) {
  return /(?:price|cost|color|colour|size|stock|available|product|variant|৳|দাম|কালার|রং|সাইজ|স্টক|পণ্য|ভ্যারিয়েশন|ভ্যারিয়েশন|কত|কতো|আছে|এইটা|এটার)/iu.test(String(text || ""));
}

export function isDeliveryQuestion(text) {
  return /(?:delivery|deliver|shipping|courier|charge|ডেলিভারি|পাঠাবেন|পাঠান|চার্জ|কুরিয়ার|কুরিয়ার|কবে পাব|কবে আসবে)/iu.test(String(text || ""));
}

export function shouldFetchOrderContext(text) {
  return ACCOUNT_REQUEST_PATTERN.test(String(text || ""));
}

export function customerRequiresHumanFollowUp(text) {
  return /(?:refund|return|cancel(?:lation)?|complaint|wrong item|damaged|broken|not received|chargeback|রিফান্ড|ফেরত|বাতিল|অভিযোগ|ভাঙা|নষ্ট|পাইনি|আসেনি|প্রতারণা|হয়রানি|হয়রানি)/iu.test(String(text || ""));
}
