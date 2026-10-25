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
  const productIds = String(query?.ids || "").split(",").filter((id) => /^[a-zA-Z0-9_-]{5,80}$/u.test(id)).slice(0, 100);
  const similarImageResults = query?.similar === "1" && productIds.length > 0;
  const filters = { ...normalizeStorefrontFilters({ ...query, variationOptions: query?.variant }), productIds };
  const [{ data, success, nextCursor }, variationOptions] = await Promise.all([
    searchProducts(rawQuery, filters),
    getStorefrontVariationOptions(),
  ]);
  const queryParams = new URLSearchParams({ ...(rawQuery && { q: rawQuery }), ...(productIds.length && { ids: productIds.join(",") }), ...(similarImageResults && { similar: "1" }) });
  return (
    <div className="p-5">
      <h1 className="text-xl font-bold mb-4">Search Results for {rawQuery}</h1>
      {similarImageResults && <p className="mb-4 text-sm text-text-muted">ছবির সঙ্গে ৫০% বা তার বেশি মিল থাকা কাছাকাছি পণ্য দেখানো হচ্ছে।</p>}
      {!success ? <p className="text-danger">পণ্য খোঁজা যায়নি। আবার চেষ্টা করুন।</p> : <SearchProductGrid key={`${rawQuery}:${JSON.stringify(filters)}`} query={rawQuery} filters={filters} initialProducts={data} initialCursor={nextCursor} variationOptions={variationOptions} queryString={queryParams.toString()} />}
    </div>
  );
}
