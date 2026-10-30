# Chat product cards

Channel-specific product card formatting lives in this folder. The dispatcher is
`backend/services/chat/aiReply/replyDelivery.js`.

- `messengerProductCards.js` builds Messenger generic cards and carousels.
- `instagramProductCards.js` builds Instagram generic cards and carousels.
- `whatsappProductCard.js` builds the WhatsApp image caption, SKU, variation text,
  and reply actions. The shared WhatsApp sender uploads and sends the image in
  `backend/services/chatChannelTextAdapter.js`.

Card button payloads use `order:<productId>` and `details:<productId>`. The Meta
webhook stores a replied-to outbound card's product ID, so a customer's text or
photo reply can be tied to that same product across Messenger and Instagram.
Keep channel-specific payload shapes here; keep webhook parsing in the channel
webhook and actual checkout state transitions in `chatOrderFlowService.js`.

Instagram cards are sent through the Instagram Messaging Generic Template. The
Instagram professional account must be connected to the configured Facebook
Page, the Page token needs messaging permission, and the app needs the Instagram
messaging webhook subscriptions for button callbacks to arrive.
