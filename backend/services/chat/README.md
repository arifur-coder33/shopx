# Chat reply flow

Chat channel routes and webhooks remain in `app/api` because Next.js requires
those entry points there. They persist inbound messages and call the shared
reply service.

The shared processing path is:

1. Receive and validate the inbound message in its channel route/webhook.
2. Identify the conversation and customer, then persist the inbound message.
3. `chatReplyBatchCore.mjs` waits for the quiet window and claims a lease.
4. `context/loadConversationHistory.js` loads the relevant message history and
   prior product anchor.
5. `context/loadBusinessContext.js` loads only relevant context. When a new
   product search is needed, the full catalog search is deferred until the AI
   selects `search_products`.
6. OpenAI receives the conversation, verified context, intent format, and
   function definitions from `tools/`. `ai/openAiFunctionLoop.js` executes
   requested backend functions, returns their results to OpenAI, and repeats
   until OpenAI produces the final structured reply.
7. `decisions/generateNaturalReply.js` validates the AI decision/reply
   contract; `decisions/intent.js` defines and validates intent categories.
8. The chat reply service validates the result against current business state,
   delivers it through the channel adapter, and persists the selected intent
   plus the names of executed tools in delivery metadata for later review.

Available functions search active products, read selected product details and
stock, calculate configured delivery charges, return already verified order
status, read published campaign data, and provide checkout options. The tool
set deliberately has no `createOrder` function: checkout lookup cannot submit
an order. Tool calls run only for the OpenAI provider. Google AI Studio retains
the existing structured-reply path and its verified order-status handler.

`aiReplyService.js` owns the shared orchestration and provider-independent
business rules. The root-level `chatAiReplyService.js` and `chatAiPrompt.js`
files are stable re-exports so existing routes and services keep working while
chat code is moved here. Channel adapters and established order-flow services
remain focused dependencies; new decision tools and context logic belong in
this folder.
