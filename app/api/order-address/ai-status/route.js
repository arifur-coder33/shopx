import { isConfiguredChatAIAvailable } from "@/backend/services/chatAiReplyService";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ enabled: await isConfiguredChatAIAvailable() }, { headers: { "Cache-Control": "no-store" } });
}
