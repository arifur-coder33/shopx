import { findSearchProducts } from "@/backend/utils/findSearchProducts";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q) {
    return NextResponse.json({ products: [] });
  }
  const products = await findSearchProducts(
    q,
    {
      id: true,
      title: true,
      slug: true,
      thumbnail: {
        select: { name: true },
      },
    },
    10,
  );

  return NextResponse.json({ products });
}
