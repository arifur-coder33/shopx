import { findSearchProducts } from "@/backend/utils/findSearchProducts";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q) {
    return NextResponse.json({ products: [] });
  }
  const matches = await findSearchProducts(
    q,
    {
      id: true,
      title: true,
      slug: true,
      thumbnail: {
        select: { name: true },
      },
    },
    100,
  );

  return NextResponse.json({ products: matches.slice(0, 10), allProductIds: matches.map((product) => product.id) });
}
