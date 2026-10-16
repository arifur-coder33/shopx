import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    const { productId } = await request.json();
    if (typeof productId !== "string" || productId.length > 64) {
      return Response.json({ success: false }, { status: 400 });
    }
    await prisma.product.updateMany({
      where: { id: productId, isActive: true },
      data: { viewCount: { increment: 1 } },
    });
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}
