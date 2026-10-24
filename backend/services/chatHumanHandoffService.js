import prisma from "@/lib/prisma";
import { handoffPhone } from "@/backend/utils/chatHumanHandoff.mjs";

// Handle a shared phone number without interrupting normal product questions.
export async function collectWebsiteHandoffContact(conversation, inbound) {
  if (conversation?.channel !== "WEBSITE" || !conversation.needsHumanAssistant || !conversation.awaitingHumanPhone || inbound?.conversationId !== conversation.id || inbound?.direction !== "INBOUND" || inbound?.authorType !== "CUSTOMER") return false;
  if (conversation.status === "CLOSED" || conversation.assignedToId || !conversation.aiModeEnabled) return true;
  const newerAgentReply = await prisma.chatMessage.findFirst({
    where: { conversationId: conversation.id, direction: "OUTBOUND", authorType: "AGENT", createdAt: { gt: inbound.createdAt } },
    select: { id: true },
  });
  if (newerAgentReply) return true;
  const phone = handoffPhone(inbound.content) || handoffPhone(conversation.customerPhone);
  const declined = /(?:ফোন|নম্বর|phone|number).{0,20}(?:দেব না|দিব না|দিতে চাই না|dibo na|dite chai na)/iu.test(inbound.content);
  const looksLikePhone = /^\+?[\d০-৯\s().-]{8,}$/u.test(String(inbound.content || "").trim()) || /(?:ফোন|নম্বর|phone|number).*[\d০-৯]{3}/iu.test(inbound.content);
  if (!phone && !declined && !looksLikePhone) return false;
  const existing = await prisma.chatMessage.findUnique({ where: { aiReplyForMessageId: inbound.id }, select: { id: true } });
  if (existing) return true;
  await prisma.$transaction([
    prisma.chatMessage.create({ data: {
      conversationId: conversation.id, channel: "WEBSITE", direction: "OUTBOUND", authorType: "AI", deliveryStatus: "SENT", aiReplyForMessageId: inbound.id,
      content: phone ? "নম্বরটি পেয়েছি। আমাদের একজন প্রতিনিধি আপনার সঙ্গে যোগাযোগ করবেন।" : declined ? "ঠিক আছে, আমাদের প্রতিনিধি এই চ্যাটেই আপনার সঙ্গে কথা বলবেন।" : "ফোন নম্বরটা ঠিক হয়নি। ১১ সংখ্যার সঠিক মোবাইল নম্বরটা দেবেন? যেমন 01712345678।",
      metadata: { type: "HUMAN_ASSISTANCE", handoffRequired: true, awaitingHumanPhone: !phone && !declined },
    } }),
    prisma.chatConversation.update({ where: { id: conversation.id }, data: {
      lastMessageAt: new Date(),
      consecutiveAiFailures: 0,
      awaitingHumanPhone: !phone && !declined,
      ...(phone && { customerPhone: phone, normalizedPhone: phone }),
    } }),
  ]);
  return true;
}
