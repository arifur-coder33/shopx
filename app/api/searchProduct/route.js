import prisma from "@/lib/prisma";
import { normalizeText } from "@/utils/normalize";
import { NextResponse } from "next/server";
import { requireCurrentStoreId } from "@/backend/services/storeContextService";

export async function GET(req) {
  const storeId = await requireCurrentStoreId();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q) {
    return NextResponse.json({ products: [] });
  }
  const variations = [q, q.slice(0, -1), q.slice(0, -2)];
  const query = normalizeText(q);

  const products = await prisma.product.findMany({
    where: {
      storeId,
      isActive: true,
      OR: variations.map((v) => ({
        searchText: { contains: v },
      })),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      thumbnail: {
        select: {
          name: true,
        },
      },
    },
    take: 10,
  });

  return NextResponse.json({ products });
}
