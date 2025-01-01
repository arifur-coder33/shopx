export const dynamic = "force-static"; // Ensures the page is statically generated

// import { getProducts } from "@/backend/serverActions/productActions";
import ProductCard from "@/components/products/ProductCard";
import ProductList from "@/components/products/productList";
import prisma from "@/lib/prisma";

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
        name: "Machinery",
        item: `${siteUrl}/category/machinery`,
      },
      {
        "@type": "ListItem",
        position: 3,
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
    title: `বিডি মার্ট 24 - bdmart24 -  আপনার বিশ্বস্ত অনলাইন শপ`,
    description:
      "বিডি মার্ট 24 - bdmart24-এ স্বাগতম! আমাদের সাইটে আপনি মেশিনারি পণ্য, ফ্যাশন, গ্যাজেট এবং আরও অনেক কিছু পাবেন। আজই শপিং করুন এবং অদ্বিতীয় ডিসকাউন্ট উপভোগ করুন।",
    keywords:
      "বিডি মার্ট 24 - bdmart24, মেশিনারি পণ্য, ফ্যাশন পণ্য, ইলেকট্রনিক্স, গ্যাজেট, শপিং, অনলাইন শপ, ডিসকাউন্ট, বিডি শপ, বাংলাদেশ, bdmart24, machinery products, fashion items, electronics, gadgets, shopping, online store, discount, BD shop, Bangladesh",
    openGraph: {
      title: `বিডি মার্ট 24 - bdmart24 - আপনার বিশ্বস্ত অনলাইন শপ`,
      description:
        "বিডি মার্ট 24 - bdmart24-এ স্বাগতম! আমাদের সাইটে আপনি মেশিনারি পণ্য, ফ্যাশন, গ্যাজেট এবং আরও অনেক কিছু পাবেন। আজই শপিং করুন এবং অদ্বিতীয় ডিসকাউন্ট উপভোগ করুন।",
      url: siteUrl,
      type: "website",
      images: [
        {
          url: `${siteUrl}/images/site_logo_og.png`,
          width: 1200,
          height: 630,
          alt: "বিডি মার্ট 24 - bdmart24 - আপনার বিশ্বস্ত অনলাইন শপ",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: siteUrl,
      title: `বিডি মার্ট 24 - bdmart24 - মেশিনারি এবং ফ্যাশন পণ্য | আপনার বিশ্বস্ত অনলাইন শপ`,
      description:
        "বিডি মার্ট 24 - bdmart24-এ স্বাগতম! আমাদের সাইটে আপনি মেশিনারি পণ্য, ফ্যাশন, গ্যাজেট এবং আরও অনেক কিছু পাবেন। আজই শপিং করুন এবং অদ্বিতীয় ডিসকাউন্ট উপভোগ করুন।",
    },
    alternates: {
      canonical: siteUrl,
    },
    structuredData: [breadcrumbJsonLd, searchJsonLd], // Include Breadcrumb and Search JSON-LD
  };
}


const getProducts = await prisma.product.findMany();

// const getProducts = unstable_cache(
//   async () => {
//     return await prisma.product.findMany();
//   },
//   ["products"],
//   { revalidate: 0.1, tags: ["products"] }
// );
export default async function Home() {
  const data = await prisma.product.findMany();

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
