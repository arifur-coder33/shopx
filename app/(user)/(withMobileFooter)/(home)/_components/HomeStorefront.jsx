import { getHomeStorefrontData } from "@/backend/serverActions/homeStorefrontActions";
import { getPublicContactDetails } from "@/backend/services/contactDetailsService";
import { getPublicSiteIdentity } from "@/backend/services/siteAppearanceService";
import { getPublishedSitePhotoReviews } from "@/backend/services/photoReviewService";
import ProductCard from "@/components/products/ProductCard";
import JsonLd from "@/components/seo/JsonLd";
import WishlistHydrationSync from "@/components/wishlist/WishlistHydrationSync";
import { getSiteUrl } from "@/lib/siteUrl";
import InfiniteProductGrid from "./InfiniteProductGrid";
import ShopByCategory from "./ShopByCategory";
import PhotoReviewCarousel from "@/components/reviews/PhotoReviewCarousel";

export default async function HomeStorefront() {
  const [result, identity, contact, siteReviews] = await Promise.all([
    getHomeStorefrontData(),
    getPublicSiteIdentity(),
    getPublicContactDetails(),
    getPublishedSitePhotoReviews(),
  ]);

  if (!result?.success) {
    return (
      <p className="mt-6 rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger">
        হোমপেজের পণ্য এখন লোড করা যাচ্ছে না।
      </p>
    );
  }

  const siteUrl = await getSiteUrl();
  const rootCategories = result.categories.filter(
    (category) => !category.parentCategoryId,
  );
  const topCategories = rootCategories.slice(0, 12);
  const sameAs = [contact.facebookPage, contact.messenger].filter(Boolean);
  const categoryItems = (
    topCategories.length ? topCategories : result.categories.slice(0, 12)
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
        ? [
            {
              "@type": "ItemList",
              "@id": `${siteUrl}/#top-categories`,
              name: "Top categories",
              numberOfItems: categoryItems.length,
              itemListElement: categoryItems,
            },
          ]
        : []),
    ],
  };

  return (
    <>
      <JsonLd data={structuredData} />

      <ShopByCategory categories={rootCategories} />

      {result.featured.products.length > 0 && (
        <section className="mt-7" aria-labelledby="featured-products-title">
          <div className="mb-3">
          
            <h2
              id="featured-products-title"
              className="text-xl font-bold sm:text-2xl"
            >
             Featured Products
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
          <h2
            id="all-products-title"
            className="mb-3 text-xl font-bold sm:text-2xl"
          >
            All Products
          </h2>
          <InfiniteProductGrid
            initialProducts={result.regular.products}
            initialCursor={result.regular.nextCursor}
          />
        </section>
      )}

      <PhotoReviewCarousel
        reviews={siteReviews}
        title="Customer reviews"
        subtitle="Our customers share their experience"
      />
    </>
  );
}
