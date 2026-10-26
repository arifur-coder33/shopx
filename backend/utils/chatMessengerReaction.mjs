const REACTIONS = { "👍": "like", "❤️": "love", "😂": "haha", "😮": "wow", "😢": "sad", "😡": "angry" };

export function messengerReaction(emoji) {
  const normalized = String(emoji || "").trim().replace(/\uFE0F/gu, "");
  const entry = Object.entries(REACTIONS).find(([candidate]) => candidate.replace(/\uFE0F/gu, "") === normalized);
  return entry ? { emoji: entry[0], code: entry[1] } : null;
}

// https://developers.facebook.com/docs/messenger-platform/send-messages/sender-actions/
export function messengerReactionPayload(recipientId, messageId, emoji, remove = false) {
  const reaction = messengerReaction(emoji);
  if (!reaction) throw new Error("এই reaction-টি supported নয়।");
  return {
    recipient: { id: recipientId },
    sender_action: remove ? "unreact" : "react",
    payload: { message_id: messageId, ...(!remove && { reaction: reaction.emoji }) },
  };
}
