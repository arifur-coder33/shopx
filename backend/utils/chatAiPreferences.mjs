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
  if (isPolicyInformationQuestion(messageText)) return false;
  const normalizedDigits = String(messageText || "").replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
  if (isOrderStatusQuestion(messageText) && /\b\d{5,9}\b/u.test(normalizedDigits)) return customerRequiresHumanFollowUp(messageText);
  return customerRequiresHumanFollowUp(messageText) || (ACCOUNT_REQUEST_PATTERN.test(String(messageText || "")) && !hasVerifiedOrder);
}

export function isPolicyInformationQuestion(text) {
  const value = String(text || "");
  return /(?:\bpolicy\b|পলিসি|নীতিমালা|নীতি)/iu.test(value) && /(?:\breturn\b|\brefund\b|\bexchange\b|ফেরত|রিফান্ড|এক্সচেঞ্জ|বদল)/iu.test(value)
    && !/(?:\b(?:my|amar|amr)\s+(?:refund|return|exchange)|\b(?:refund|return|exchange)\s+(?:status|pending|complaint)|আমার\s*(?:রিফান্ড|ফেরত)|রিফান্ড\s*(?:স্ট্যাটাস|পাইনি)|অভিযোগ)/iu.test(value);
}

export function isOrderStatusQuestion(text) {
  return /(?:\b(?:track|tracking)\b|\b(?:order|shipment|parcel)\b.{0,30}\b(?:status|update|where)\b|\b(?:where|kothay)\b.{0,30}\border\b|অর্ডার.{0,24}(?:অবস্থা|স্ট্যাটাস|কোথায়|কোথায়|খোঁজ)|(?:ট্র্যাক|পার্সেল|কুরিয়ার|কুরিয়ার).{0,24}(?:অবস্থা|স্ট্যাটাস|কোথায়|কোথায়|খোঁজ))/iu.test(String(text || ""));
}

const ACCOUNT_REQUEST_PATTERN = /(?:\border\b|\btrack(?:ing)?\b|\brefund\b|\breturn\b|\bcancel(?:lation)?\b|\bparcel\b|\bpackage\b|\bshipment\b|\b(?:delivery|order) status\b|অর্ডার|ট্র্যাক|রিফান্ড|ফেরত|বাতিল|অর্ডারের অবস্থা|অর্ডার স্ট্যাটাস|পার্সেল|প্যাকেজ|কুরিয়ার স্ট্যাটাস|কুরিয়ার স্ট্যাটাস)/iu;

export function isProductQuestion(text) {
  return /(?:price|cost|dam|damer|koto|kotho|ache|ase|available|electric|machine|machin|grass|ghas|cutter|trimmer|weed|mower|battery|brand|model|color|colour|size|stock|product|variant|shirt|shirts|pant|pants|trouser|dress|tshirt|t-shirt|saree|sharee|kurti|bag|shoe|shoes|juta|sandal|watch|mobile|phone|product|category|catalog|catalogue|lagbe|need|looking\s+for|৳|দাম|কালার|রং|সাইজ|স্টক|পণ্য|প্রোডাক্ট|ক্যাটাগরি|ক্যাটালগ|শার্ট|প্যান্ট|জামা|জুতা|ব্যাগ|কত|কতো|আছে|এইটা|এটার|ঘাস|কাটার|মেশিন|লাগবে|চাই)/iu.test(String(text || ""));
}

export function isDeliveryQuestion(text) {
  return /(?:delivery|deliver|shipping|courier|\bcharge(?:s|d)?\b|ডেলিভারি|পাঠাবেন|পাঠান|চার্জ(?!ার)|কুরিয়ার|কুরিয়ার|কবে পাব|কবে আসবে)/iu.test(String(text || ""));
}

export function isProductImageRequest(text) {
  const message = String(text || "");
  return /(?:\b(?:send|show|share|see|get)\b.{0,35}\b(?:photo|picture|image|pic)\b|\b(?:photo|picture|image|pic|chobi)\b.{0,35}\b(?:send|show|share|see|want|please|den|din|pathan|dekhan|chai)\b|ছবি|ফটো|পণ্যের\s*ছবি|প্রোডাক্টের\s*ছবি)/iu.test(message);
}

export function hasInboundImage(metadata) {
  if (metadata?.image?.mediaId || metadata?.image?.url) return true;
  return (metadata?.attachments || []).some((attachment) => attachment?.type === "image" || attachment?.payload?.url && /image/i.test(attachment?.type || ""));
}

export function selectRelevantAiReplyExamples(examples, customerText, limit = 3) {
  const normalize = (value) => String(value || "")
    .toLocaleLowerCase()
    .replace(/[?!.,;:()[\]{}'"`~@#$%^&*_+=|\\<>/\-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  const tokenize = (value) => new Set((normalize(value).match(/[\p{L}\p{N}]{2,}/gu) || []).filter((word) => !["ami", "amar", "apni", "tumi", "eta", "etar", "ki", "the", "is", "are", "you", "this", "that", "for", "and", "please", "দাম", "কত", "কি", "এই", "এটা", "আমার", "আপনি"].includes(word)));
  const normalizedCustomerText = normalize(customerText);
  const current = tokenize(customerText);
  if (!normalizedCustomerText) return [];
  return (Array.isArray(examples) ? examples : [])
    .filter((example) => typeof example?.question === "string" && typeof example.answer === "string")
    .map((example) => {
      const exact = normalize(example.question) === normalizedCustomerText;
      const terms = tokenize(example.question);
      const overlap = [...terms].filter((term) => current.has(term)).length;
      return { example, score: exact ? 2 : overlap / Math.max(1, terms.size) };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, Math.min(5, limit)))
    .map(({ example }) => ({ question: example.question.slice(0, 300), answer: example.answer.slice(0, 500) }));
}

export function findExactAiReplyExample(examples, customerText) {
  const normalize = (value) => String(value || "")
    .toLocaleLowerCase()
    .replace(/[?!.,;:()[\]{}'"`~@#$%^&*_+=|\\<>/\-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  const target = normalize(customerText);
  if (!target) return null;
  const match = (Array.isArray(examples) ? examples : []).find(
    (example) =>
      typeof example?.question === "string" &&
      typeof example?.answer === "string" &&
      normalize(example.question) === target,
  );
  return match
    ? { question: match.question.slice(0, 300), answer: match.answer.slice(0, 500) }
    : null;
}

export function shouldFetchOrderContext(text) {
  return ACCOUNT_REQUEST_PATTERN.test(String(text || ""));
}

export function customerRequiresHumanFollowUp(text) {
  return /(?:refund|return|cancel(?:lation)?|complaint|wrong item|damaged|broken|not received|chargeback|রিফান্ড|ফেরত|বাতিল|অভিযোগ|ভাঙা|নষ্ট|পাইনি|আসেনি|প্রতারণা|হয়রানি|হয়রানি)/iu.test(String(text || ""));
}
