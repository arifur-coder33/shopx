import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();

  if (!q) return NextResponse.json([]);

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      searchText: {
        contains: q,
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
    },
    take: 5,
  });

  return NextResponse.json(products);
}
