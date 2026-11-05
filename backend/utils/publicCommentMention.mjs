// Only use identities supplied by Meta, never AI-generated/display names.
// Meta controls how Facebook's ID mention renders and whether it notifies.
export function publicCommentReplyText({ reply, platform, authorId, authorUsername }) {
  const text = String(reply || "").trim();
  if (!text) return text;
  if (platform === "FACEBOOK") {
    const id = String(authorId || "").trim();
    if (!/^[1-9][0-9]{0,79}$/.test(id)) return text;
    const mention = `@[${id}]`;
    return text.startsWith(mention) ? text : `${mention} ${text}`;
  }
  const username = String(authorUsername || "").trim().replace(/^@/, "");
  if (platform !== "INSTAGRAM" || !/^[A-Za-z0-9._]{1,30}$/.test(username)) return text;
  const mention = `@${username}`;
  const alreadyAddressed = text.toLowerCase().startsWith(mention.toLowerCase())
    && (!text[mention.length] || /[\s,:!\u0964\u3002]/.test(text[mention.length]));
  return alreadyAddressed ? text : `${mention} ${text}`;
}
