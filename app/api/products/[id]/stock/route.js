import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id || "")) {
    return Response.json({ message: "Invalid product." }, { status: 400, headers });
  }
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        isActive: true,
        allowOutOfStockOrder: true,
        variations: { select: { id: true, stocks: { select: { available: true } } } },
      },
    });
    if (!product || product.isActive === false) {
      return Response.json({ message: "Product unavailable." }, { status: 404, headers });
    }
    return Response.json({
      allowOutOfStockOrder: Boolean(product.allowOutOfStockOrder),
      variations: product.variations.map((variation) => ({
        id: variation.id,
        stock: variation.stocks.reduce((sum, row) => sum + Math.max(0, Number(row.available) || 0), 0),
      })),
    }, { headers });
  } catch {
    return Response.json({ message: "Could not check stock." }, { status: 503, headers });
  }
}
