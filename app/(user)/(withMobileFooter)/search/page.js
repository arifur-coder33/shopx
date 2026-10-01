import { searchProducts } from "@/backend/serverActions/productActions";
import ProductCard from "@/components/products/ProductCard";

export const metadata = {
  title: "পণ্য খুঁজুন",
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }) {
  const { q } = await searchParams;
  const rawQuery = typeof q === "string" ? q : "";

  const { data, success } = await searchProducts(rawQuery);
  return (
    <div className="p-5">
      <h1 className="text-xl font-bold mb-4">Search Results for {rawQuery}</h1>

      {data.length === 0 && <div>No products found</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.map((item, index) => (
          <ProductCard key={item.id} product={item} priority={index < 2} />
        ))}
      </div>
    </div>
  );
}
