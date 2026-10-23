export const CHAT_AI_MODELS = {
  OPENAI: [
    { id: "gpt-6-luna", label: "GPT-6 Luna (ডিফল্ট, দ্রুত ও সাশ্রয়ী)" },
    { id: "gpt-6.1-sol", label: "GPT-6.1 Sol" },
    { id: "gpt-6-astra", label: "GPT-6 Astra" },
  ],
  GOOGLE_AI_STUDIO: [
    { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash (ডিফল্ট)" },
    { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  ],
};

export const DEFAULT_CHAT_AI_MODELS = {
  OPENAI: "gpt-6-luna",
  GOOGLE_AI_STUDIO: "gemini-3.8-flash",
};

export function isChatAiModelAllowed(provider, model) {
  return CHAT_AI_MODELS[provider]?.some((item) => item.id === model) || false;
}
