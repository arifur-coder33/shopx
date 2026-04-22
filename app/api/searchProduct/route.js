import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeText } from "@/utils/normalize";


export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q) {
    return NextResponse.json({ products: [] });
  }

  const query = normalizeText(q);

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      searchText: {
        contains: query,
      },
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
