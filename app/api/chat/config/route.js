import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const setting = await prisma.chatSetting.findUnique({ where: { id: "primary" }, select: { websiteChatEnabled: true, welcomeMessage: true } });
  const session = await auth();
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, phone: true } }) : null;
  return Response.json({ enabled: setting?.websiteChatEnabled ?? true, welcomeMessage: setting?.welcomeMessage || "আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি?", customer: user ? { name: user.name || "", phone: user.phone || "" } : null }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
