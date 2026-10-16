import { searchProducts } from "@/backend/serverActions/productActions";
import SearchProductGrid from "./SearchProductGrid";
import { normalizeStorefrontFilters } from "@/backend/utils/storefrontProductFilters";
import { getStorefrontVariationOptions } from "@/backend/utils/getStorefrontVariationOptions";

export const metadata = {
  title: "পণ্য খুঁজুন",
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }) {
  const query = await searchParams;
  const { q } = query;
  const rawQuery = typeof q === "string" ? q : "";
  const filters = normalizeStorefrontFilters({ ...query, variationOptions: query?.variant });
  const [{ data, success, nextCursor }, variationOptions] = await Promise.all([
    searchProducts(rawQuery, filters),
    getStorefrontVariationOptions(),
  ]);
  return (
    <div className="p-5">
      <h1 className="text-xl font-bold mb-4">Search Results for {rawQuery}</h1>
      {!success ? <p className="text-danger">পণ্য খোঁজা যায়নি। আবার চেষ্টা করুন।</p> : <SearchProductGrid key={`${rawQuery}:${JSON.stringify(filters)}`} query={rawQuery} filters={filters} initialProducts={data} initialCursor={nextCursor} variationOptions={variationOptions} queryString={new URLSearchParams({ q: rawQuery }).toString()} />}
    </div>
  );
}
