import prisma from "@/lib/prisma";
import { normalizeText } from "@/utils/normalize";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q) {
    return NextResponse.json({ products: [] });
  }
  const variations = [
    q,
    q.slice(0, -1), // iphonee → iphone
    q.slice(0, -2), // extra safety
  ];
  const query = normalizeText(q);

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: variations.map((v) => ({
        searchText: { contains: v },
      })),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      thumbnail: true,
    },
    take: 10,
  });

  return NextResponse.json({ products });
}
