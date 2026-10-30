# Chat AI reply modules

`../aiReplyService.js` is the stable entry point used by the rest of the app. It re-exports the public functions, while the implementation is split here by responsibility.

## Request flow

1. `orchestration.js` receives an inbound message, loads context, decides which work is needed, and coordinates the reply.
2. `productMemory.js`, `orderContext.js`, `catalogLookup.js`, `catalogImages.js`, and `customerMedia.js` gather product, order, and media context.
3. `replyGeneration.js` builds the AI input and produces a customer-facing answer.
4. `replyDelivery.js` sends the answer through the connected channel and handles human takeover.

## File guide

- `foundation.js` — shared constants, text and provider helpers, and Bangladesh address verification.
- `productMemory.js` — remembers the product under discussion and interprets short follow-up questions such as price or stock questions.
- `catalogLookup.js` — searches products and gathers public shop, campaign, delivery, and contact information.
- `catalogImages.js` — matches customer images against catalog images and checks whether an AI provider is configured.
- `customerMedia.js` — reads and describes customer-sent images and finds product links in messages.
- `orderContext.js` — finds a customer's verified orders and order number references.
- `replyGeneration.js` — prepares instructions and context, then asks the configured AI provider to write the reply.
- `replyDelivery.js` — delivers text, image, and product replies, and stops replies when a human has taken over.
- `facebookComments.js` — generates AI replies for Facebook Page comments.

Keep shared helpers in the smallest relevant module and import them where needed. The facade should remain the import path for other services so callers do not depend on internal file layout.
