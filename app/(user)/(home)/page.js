export const dynamic = "force-static"; // Ensures the page is statically generated

// import { getProducts } from "@/backend/serverActions/productActions";
import ProductCard from "@/components/products/ProductCard";
import ProductList from "@/components/products/productList";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import HeroSection from "./_components/HeroSection";

export async function generateMetadata() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Electronics",
        item: `${siteUrl}/category/electronics`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Machinary",
        item: `${siteUrl}/category/machinary`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Fashion",
        item: `${siteUrl}/category/fashion`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Fashion",
        item: `${siteUrl}/category/fashion`,
      },
    ],
  };

  const searchJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return {
    title: `Home - ${process.env.NEXT_SHOP_NAME} `,
    description:
      "Discover top products across various categories. Shop now for exclusive discounts on electronics, fashion, home essentials, and more.",
    openGraph: {
      title: `Home - ${process.env.NEXT_SHOP_NAME} `,
      description:
        "Discover top products across various categories. Shop now for exclusive discounts on electronics, fashion, home essentials, and more.",
      url: siteUrl,
      type: "website",
      images: [
        {
          url: `${siteUrl}/images/site_logo_og.png`,
          width: 1200,
          height: 630,
          alt: "Your E-Commerce Website Banner",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: siteUrl,
      title: `Home - ${process.env.NEXT_SHOP_NAME}  - Your E-Commerce Website`,
      description:
        "Discover top products across various categories. Shop now for exclusive discounts on electronics, fashion, home essentials, and more.",
    },
    alternates: {
      canonical: siteUrl,
    },
    structuredData: [breadcrumbJsonLd, searchJsonLd], // Include Breadcrumb and Search JSON-LD
  };
}

const getProducts = unstable_cache(
  async () => {
    return await prisma.product.findMany();
  },
  ["products"],
  { revalidate: 60, tags: ["products"] }
);

export default async function Home() {
  const data = await getProducts();

  return (
    <>
      <HeroSection />
      <ProductList headerName={"টপ প্রোডাক্ট"}>
        {data?.length > 0 &&
          data?.map((product) => (
            <ProductCard
              key={product?.id}
              productId={product?.slug}
              productName={product?.title}
              regularPrice={product?.regularPrice}
              discountPrice={product?.discountPrice}
              imageSrc={product?.mainImage}
              slug={product?.slug}
            />
          ))}
      </ProductList>
    </>
  );
}
