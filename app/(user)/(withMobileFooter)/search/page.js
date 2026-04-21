import prisma from "@/lib/prisma";
import { normalizeText } from "@/utils/normalize";
import Link from "next/link";

export default async function SearchPage({ searchParams }) {
  const rawQuery = searchParams.q || "";
  const q = normalizeText(rawQuery);

  const products = await prisma.product.findMany({
    where: {
      AND: [
        { isActive: true },
        {
          OR: [
            {
              title: { contains: q, mode: "insensitive" },
            },
            {
              description: { contains: q, mode: "insensitive" },
            },
            {
              category: {
                name: { contains: q, mode: "insensitive" },
              },
            },
          ],
        },
      ],
    },
    include: {
      category: true,
    },
    take: 50,
  });

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold mb-4">Search Results for {rawQuery}</h1>

      {products.length === 0 && <div>No products found</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((item) => (
          <Link
            key={item.id}
            href={`/product/${item.slug}`}
            className="border p-3 block hover:shadow rounded-lg"
          >
            <div className="font-medium">{item.title}</div>
            <div className="text-sm text-gray-500">{item.category?.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
