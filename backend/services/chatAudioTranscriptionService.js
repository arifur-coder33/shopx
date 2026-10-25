const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MEDIA_HOSTS = ["fbcdn.net", "fbsbx.com", "cdninstagram.com", "facebook.com", "tiktok.com", "tiktokcdn.com"];

function safeAudioUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Audio URL is invalid."); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || !MEDIA_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    throw new Error("Audio URL host is not supported.");
  }
  return url;
}

async function responseBytes(response) {
  if (!response.ok) throw new Error("Audio download failed.");
  const mimeType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  const declaredLength = Number(response.headers.get("content-length")) || 0;
  if (declaredLength > MAX_AUDIO_BYTES) throw new Error("Audio exceeds the supported size.");
  if (!response.body) throw new Error("Audio response is empty.");
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_AUDIO_BYTES) {
      await reader.cancel();
      throw new Error("Audio exceeds the supported size.");
    }
    chunks.push(Buffer.from(value));
  }
  const bytes = Buffer.concat(chunks, total);
  if (!bytes.length || bytes.length > MAX_AUDIO_BYTES) throw new Error("Audio is empty or exceeds the supported size.");
  return { bytes, mimeType };
}

async function getAudioFile(message, channel, credentials) {
  const metadata = message?.metadata || {};
  let audio = metadata.audio || null;
  for (const attachment of metadata.attachments || []) {
    if (String(attachment?.type || "").toLowerCase() !== "audio") continue;
    const url = attachment?.payload?.url || attachment?.url;
    audio = { ...(audio || {}), ...(url && { url }), mimeType: attachment?.payload?.mime_type || attachment?.mime_type || audio?.mimeType };
    break;
  }
  if (!audio) return null;

  const mimeType = String(audio.mimeType || audio.mime_type || "audio/mpeg").split(";")[0].toLowerCase();
  if (!mimeType.startsWith("audio/")) throw new Error("Unsupported audio format.");
  if (audio.mediaId && channel === "WHATSAPP") {
    const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
    const token = credentials.whatsappAccessToken;
    if (!token || !/^v\d+\.\d+$/.test(version || "")) throw new Error("WhatsApp audio credentials are unavailable.");
    const infoResponse = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(audio.mediaId)}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    const info = await infoResponse.json().catch(() => ({}));
    if (!infoResponse.ok || !info.url) throw new Error("WhatsApp audio media could not be located.");
    safeAudioUrl(info.url);
    const response = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(20000) });
    return responseBytes(response);
  }

  if (!audio.url) throw new Error("Audio media URL is unavailable.");
  const url = safeAudioUrl(audio.url);
  const response = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000) });
  const file = await responseBytes(response);
  return { ...file, mimeType: file.mimeType.startsWith("audio/") ? file.mimeType : mimeType };
}

export async function transcribeChatAudio(message, channel, credentials, aiConfig) {
  const file = await getAudioFile(message, channel, credentials);
  if (!file) return null;
  if (!aiConfig?.apiKey) throw new Error("Audio transcription needs the configured AI API key.");

  if (aiConfig.provider === "GOOGLE_AI_STUDIO") {
    const model = aiConfig.model?.startsWith("gemini-") ? aiConfig.model : "gemini-2.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": aiConfig.apiKey },
      body: JSON.stringify({ contents: [{ role: "user", parts: [
        { inlineData: { mimeType: file.mimeType, data: file.bytes.toString("base64") } },
        { text: "Transcribe this audio exactly. Preserve the speaker's language, including Bangla, English, or Banglish. Return only the spoken words; do not summarize or answer them." },
      ] }], generationConfig: { temperature: 0, maxOutputTokens: 2048 } }),
      cache: "no-store", signal: AbortSignal.timeout(45000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error?.message || "Google AI audio transcription failed.");
    const transcript = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join(" ").trim();
    if (!transcript) throw new Error("Audio transcription returned no text.");
    return transcript.slice(0, 4000);
  }

  const form = new FormData();
  const extension = file.mimeType.includes("ogg") ? "ogg" : file.mimeType.includes("wav") ? "wav" : file.mimeType.includes("mp4") ? "m4a" : "mp3";
  form.set("file", new Blob([file.bytes], { type: file.mimeType }), `customer-audio.${extension}`);
  form.set("model", "gpt-4o-mini-transcribe");
  form.set("prompt", "Transcribe accurately in the speaker's language. The audio may contain Bangla, English, or Banglish.");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${aiConfig.apiKey}` }, body: form,
    cache: "no-store", signal: AbortSignal.timeout(45000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || "OpenAI audio transcription failed.");
  const transcript = String(result.text || "").trim();
  if (!transcript) throw new Error("Audio transcription returned no text.");
  return transcript.slice(0, 4000);
}
