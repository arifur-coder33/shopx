/** Run the configured AI decision/reply stage and validate its backend contract. */
export async function generateNaturalReply(generate, input) {
  const decision = await generate(...input);
  if (!decision || typeof decision !== "object") {
    throw new Error("Chat AI returned an invalid decision.");
  }
  if (typeof decision.text !== "string") {
    throw new Error("Chat AI decision is missing its reply text.");
  }
  return {
    ...decision,
    products: Array.isArray(decision.products) ? decision.products : [],
    videoLinks: Array.isArray(decision.videoLinks) ? decision.videoLinks : [],
    mediaPhotos: Array.isArray(decision.mediaPhotos) ? decision.mediaPhotos : [],
  };
}
