export function handoffPhone(value) {
  const text = String(value || "").replace(/[০-৯]/gu, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit))).replace(/[\s().-]/gu, "");
  const match = text.match(/(?<!\d)(?:\+?88)?01[3-9]\d{8}(?!\d)/u)?.[0];
  if (!match) return null;
  const digits = match.replace(/\D/gu, "");
  return digits.startsWith("88") ? digits : `88${digits}`;
}

export function humanHandoffReason({ customerText = "", reply = {}, requiresHumanFollowUp = false }) {
  if (/(?:\b(?:speak|talk|connect|need|want)\b.{0,35}\b(?:human|agent|representative|person)\b|(?:মানুষ|প্রতিনিধি|কর্মকর্তা).{0,25}(?:কথা|চাই)|(?:human|agent|protinidhi).{0,20}(?:chai|lagbe|kotha))/iu.test(customerText)) return "CUSTOMER_REQUEST";
  if (requiresHumanFollowUp) return "FOLLOW_UP";
  if (["UNKNOWN_INFORMATION", "CUSTOMER_REQUEST", "FOLLOW_UP"].includes(reply.humanAssistance)) return reply.humanAssistance;
  if (reply.imageSearch?.failed) return "UNKNOWN_INFORMATION";
  if (/(?:তথ্য|বিবরণ|বিস্তারিত|দাম|চার্জ|ওজন|ওয়ারেন্টি|ওয়্যারেন্টি|পলিসি).{0,65}(?:দেওয়া নেই|দেওয়া নেই|উল্লেখ নেই|জানা নেই|পাওয়া যাচ্ছে না|পাওয়া যাচ্ছে না|নিশ্চিত করতে পারছি না|যাচাই করতে পারছি না)|(?:এই\s*)?(?:তথ্য|বিষয়|বিষয়).{0,25}আমার কাছে নেই|\b(?:I (?:do not|don't) (?:know|have)|cannot (?:confirm|verify)|information (?:is )?(?:not available|missing|unavailable))/iu.test(reply.text || "")) return "UNKNOWN_INFORMATION";
  return null;
}

export function humanHandoffReply({ channel, reason, customerPhone, english = false }) {
  const awaitingPhone = channel === "WEBSITE" && !handoffPhone(customerPhone);
  const text = english
    ? `${reason === "UNKNOWN_INFORMATION" ? "I don't have that information right now. " : ""}One of our representatives will ${channel === "WEBSITE" ? "contact you" : "reply to you here"}.${awaitingPhone ? " Could you share your phone number?" : ""}`
    : `${reason === "UNKNOWN_INFORMATION" ? "এই তথ্যটা আমার কাছে নেই। " : ""}আমাদের একজন প্রতিনিধি ${channel === "WEBSITE" ? "আপনার সঙ্গে যোগাযোগ করবেন" : "এই চ্যাটেই আপনার সঙ্গে যোগাযোগ করবেন"}।${awaitingPhone ? " আপনার ফোন নম্বরটা দেবেন?" : ""}`;
  return { text, awaitingPhone };
}
