export function normalizeChatPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^01\d{9}$/.test(digits)) digits = `88${digits}`;
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

// Only treat a message as a phone number when the customer sent the number itself.
export function sharedChatPhone(text) {
  const value = String(text || "").trim();
  if (!/^[+\d][\d\s().-]{7,20}$/.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  if (!/^01\d{9}$/.test(digits) && !/^8801\d{9}$/.test(digits) && !/^\+[1-9]\d{7,14}$/.test(value.replace(/[\s().-]/g, ""))) return null;
  return normalizeChatPhone(value);
}

export function groupChatInbox(conversations) {
  const groups = new Map();
  for (const item of conversations) {
    const key = item.normalizedPhone && ["WHATSAPP", "MESSENGER"].includes(item.channel)
      ? `phone:${item.normalizedPhone}`
      : `conversation:${item.id}`;
    if (!groups.has(key)) {
      groups.set(key, { ...item, linkedConversations: [], channels: [], unreadCount: 0 });
    }
    const group = groups.get(key);
    group.linkedConversations.push({ id: item.id, channel: item.channel, status: item.status, externalUserId: item.externalUserId, customerPhone: item.customerPhone, customerName: item.customerName });
    if (!group.channels.includes(item.channel)) group.channels.push(item.channel);
    group.unreadCount += item.unreadCount;
    if (!group.profilePicUrl && item.profilePicUrl) group.profilePicUrl = item.profilePicUrl;
    if ((item.customerName || "").trim().split(/\s+/).length > (group.customerName || "").trim().split(/\s+/).length) group.customerName = item.customerName;
  }
  return [...groups.values()].map((group) => ({
    ...group,
    id: group.linkedConversations.map((item) => item.id).sort()[0],
    customerName: group.linkedConversations.find((item) => item.channel === "MESSENGER" && item.customerName)?.customerName || group.customerName,
  }));
}
