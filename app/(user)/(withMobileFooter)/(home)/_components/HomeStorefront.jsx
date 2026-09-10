import { getHomeStorefrontData } from "@/backend/serverActions/homeStorefrontActions";
import { getPublicContactDetails } from "@/backend/services/contactDetailsService";
import { getPublicSiteIdentity } from "@/backend/services/siteAppearanceService";
import ProductCard from "@/components/products/ProductCard";
import JsonLd from "@/components/seo/JsonLd";
import WishlistHydrationSync from "@/components/wishlist/WishlistHydrationSync";
import { getSiteUrl } from "@/lib/siteUrl";
import InfiniteProductGrid from "./InfiniteProductGrid";
import ShopByCategory from "./ShopByCategory";

export default async function HomeStorefront() {
  const [result, identity, contact] = await Promise.all([
    getHomeStorefrontData(),
    getPublicSiteIdentity(),
    getPublicContactDetails(),
  ]);

  if (!result?.success) {
    return (
      <p className="mt-6 rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger">
        হোমপেজের পণ্য এখন লোড করা যাচ্ছে না।
      </p>
    );
  }

  const siteUrl = await getSiteUrl();
  const topCategories = result.categories
    .filter((category) => !category.parentCategoryId)
    .slice(0, 12);
  const sameAs = [contact.facebookPage, contact.messenger].filter(Boolean);
  const categoryItems = (topCategories.length
    ? topCategories
    : result.categories.slice(0, 12)
  ).map((category, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: category.name,
    url: new URL(
      `/category/${String(category.fullPath || category.slug)
        .split("/")
        .filter(Boolean)
        .map(encodeURIComponent)
        .join("/")}`,
      `${siteUrl}/`,
    ).toString(),
  }));
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: identity.name,
        alternateName: new URL(siteUrl).hostname,
        description: identity.seoDescription,
        inLanguage: "bn-BD",
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        url: `${siteUrl}/`,
        name: identity.name,
        description: identity.seoDescription,
        ...(identity.logoUrl && { logo: identity.logoUrl }),
        ...(contact.email && { email: contact.email }),
        ...(contact.phoneNumber && { telephone: contact.phoneNumber }),
        ...(sameAs.length && { sameAs }),
      },
      ...(categoryItems.length
        ? [{
            "@type": "ItemList",
            "@id": `${siteUrl}/#top-categories`,
            name: "Top categories",
            numberOfItems: categoryItems.length,
            itemListElement: categoryItems,
          }]
        : []),
    ],
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <section className="mt-4 rounded-2xl border border-border bg-surface px-4 py-4 shadow-sm sm:px-6">
        <h1 className="text-2xl font-black text-text sm:text-3xl">{identity.name}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-text-muted sm:text-base">
          {identity.seoDescription}
        </p>
      </section>
      <ShopByCategory categories={result.categories} />

      {result.featured.products.length > 0 && (
        <section className="mt-7" aria-labelledby="featured-products-title">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              আমাদের পছন্দ
            </p>
            <h2
              id="featured-products-title"
              className="text-xl font-bold sm:text-2xl"
            >
              ফিচার্ড পণ্য
            </h2>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
            {result.featured.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <WishlistHydrationSync />
        </section>
      )}

      {result.regular.products.length > 0 && (
        <section className="mt-7" aria-labelledby="all-products-title">
          <h2 id="all-products-title" className="mb-3 text-xl font-bold sm:text-2xl">
            সকল পণ্য
          </h2>
          <InfiniteProductGrid
            initialProducts={result.regular.products}
            initialCursor={result.regular.nextCursor}
          />
        </section>
      )}
    </>
  );
}
