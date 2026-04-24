import ProductCard from "@/components/products/ProductCard";
import prisma from "@/lib/prisma";
import { normalizeText } from "@/utils/normalize";

export default async function SearchPage({ searchParams }) {
  const rawQuery = searchParams.q || "";
  const q = normalizeText(rawQuery);

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
      thumbnail: { select: { name: true } },
      variations: true,
    },
    take: 10,
  });

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold mb-4">Search Results for {rawQuery}</h1>

      {products.length === 0 && <div>No products found</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </div>
    </div>
  );
}
