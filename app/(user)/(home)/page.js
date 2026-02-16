export const dynamic = "force-static"; // Ensures the page is statically generated

// import { getProducts } from "@/backend/serverActions/productActions";
import CategoryWiseProductList from "./_components/CategoryWiseProductList";
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
    title: `বিডিমার্ট24  -  আপনার বিশ্বস্ত অনলাইন শপ`,
    description:
      "এখানে আপনি মেশিনারি পণ্য, ফ্যাশন, গ্যাজেট এবং আরও অনেক কিছু পাবেন। কোন টাকা অ্যাডভাঞ্চ আজই অর্ডার করুন এবং ডিসকাউন্ট উপভোগ করুন।",
    keywords:
      "বিডিমার্ট24, bdmart24, bd mart 24, বিডি মার্ট 24, বিডিমার্ট২৪, বিডি মার্ট ২৪, bdmart24.online, bdmart, martbd, martbd24, shopping in bd, bd shop, bdshop24, online shopping in bd, online shopping in Bangladesh, মেশিনারি পণ্য, ফ্যাশন পণ্য, ইলেকট্রনিক্স, গ্যাজেট, শপিং, অনলাইন শপ, ডিসকাউন্ট, বিডি শপ, বাংলাদেশ, bdmart24, machinery products, fashion items, electronics, gadgets, shopping, online store, discount, BD shop, Bangladesh",
    openGraph: {
      title: `বিডিমার্ট24  - আপনার বিশ্বস্ত অনলাইন শপ`,
      description:
        "এখানে আপনি মেশিনারি পণ্য, ফ্যাশন, গ্যাজেট এবং আরও অনেক কিছু পাবেন। কোন টাকা অ্যাডভাঞ্চ আজই অর্ডার করুন এবং ডিসকাউন্ট উপভোগ করুন।",
      url: siteUrl,
      type: "website",
      images: [
        {
          url: `${siteUrl}/images/site_logo_og.png`,
          width: 1200,
          height: 630,
          alt: "বিডিমার্ট24  - আপনার বিশ্বস্ত অনলাইন শপ",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: siteUrl,
      title: `বিডিমার্ট24  - আপনার বিশ্বস্ত অনলাইন শপ`,
      description:
        "এখানে আপনি মেশিনারি পণ্য, ফ্যাশন, গ্যাজেট এবং আরও অনেক কিছু পাবেন। কোন টাকা অ্যাডভাঞ্চ আজই অর্ডার করুন এবং ডিসকাউন্ট উপভোগ করুন।",
    },
    alternates: {
      canonical: siteUrl,
    },
    structuredData: [breadcrumbJsonLd, searchJsonLd], // Include Breadcrumb and Search JSON-LD
  };
}

export default async function Home() {
  // const data = await prisma.product.findMany();

  return (
    <>
      <HeroSection />
      <CategoryWiseProductList />
    </>
  );
}
