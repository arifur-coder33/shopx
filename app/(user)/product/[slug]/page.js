// app/product/[slug]/page.js   (JavaScript ফাইল)

import {
  getProductBySlug,
  getProducts,
} from "@/backend/serverActions/productActions";
import KalapanaFont from "@/components/KalapanaFont";
import ProductDescription from "@/components/products/productDescription";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { convertImageToOG_cloudinary } from "@/utils/replaceImageurl";
import { htmlToText } from "html-to-text";
import { notFound } from "next/navigation";
import Script from "next/script";
import FacebookEventTrac from "../_components/FacebookEventTrack";
import BuyNowSection from "./_components/BuyNowSection";
import Images from "./_components/Images";
import { ProductImageGallery } from "./_components/Images/ProductImagegallery";

// SSG – সব প্রোডাক্টের slug আগে থেকে জেনারেট করবে
export async function generateStaticParams() {
  const res = await getProducts();
  if (!res?.data) return [];
  return res.data.map((product) => ({
    slug: product.slug,
  }));
}

// SEO + OG + Twitter Metadata
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const res = await getProductBySlug(slug);

  if (!res?.data) {
    return {
      title: `প্রোডাক্ট পাওয়া যায়নি - ${process.env.NEXT_SHOP_NAME}`,
      description: "যে প্রোডাক্টটি আপনি খুঁজছেন তা পাওয়া যায়নি।",
      robots: "noindex, nofollow",
    };
  }

  const p = res.data;
  const price = p.discountPrice || p.regularPrice;

  const formattedPrice = new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
  }).format(price);

  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/product/${slug}`;
  const ogImage = convertImageToOG_cloudinary(
    cloudinaryMainImage(p.mainImage, 1200, 630),
    "t_to_og"
  );

  return {
    title: `${p.title} - মাত্র ${formattedPrice} টাকায়`,
    description:
      p.seoDescription || htmlToText(p.description || "").slice(0, 155) + "...",
    keywords: [
      p.title,
      p.seoKeyWord,
      p.category?.name,
      "অনলাইনে কেনা",
      "বাংলাদেশ ডেলিভারি",
      "সস্তায় কেনা",
    ].filter(Boolean),
    alternates: { canonical: url },
    openGraph: {
      title: `${p.title} - মাত্র ${formattedPrice} টাকায়`,
      description: p.seoDescription || htmlToText(p.description || ""),
      url,
      images: [{ url: ogImage || "/og-default.jpg", width: 1200, height: 630 }],
      type: "website",
      locale: "bn_BD",
    },
    twitter: {
      card: "summary_large_image",
      title: `${p.title} - ${formattedPrice} টাকা`,
      description:
        p.seoDescription || htmlToText(p.description || "").slice(0, 150),
      images: [ogImage || "/og-default.jpg"],
    },
    robots: "index, follow",
  };
}

// Main Page
export default async function ProductPage({ params }) {
  const { slug } = await params;
  const res = await getProductBySlug(slug);

  if (!res?.data) notFound();

  const p = res.data;
  const price = p.discountPrice || p.regularPrice;
  const savings = p.regularPrice - price;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/product/${slug}`;

  // সব ইমেজ (fallback সহ)
  const mainImg = cloudinaryMainImage(p.mainImage, 800, 800);
  const galleryImgs =
    p.imageGallery?.map((img) => cloudinaryMainImage(img, 800, 800)) || [];
  const allImages = [mainImg, ...galleryImgs].filter(Boolean);

  // Google + Merchant Center এর জন্য পারফেক্ট Schema (2025 স্ট্যান্ডার্ড)
  const googleSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": url + "#product",
    name: p.title,
    description: htmlToText(p.description || "").slice(0, 500),
    sku: p.id,
    mpn: p.id,
    brand: { "@type": "Brand", name: "bdmart24" },
    image: allImages,
    url: url,
    offers: {
      "@type": "Offer",
      url: url,
      priceCurrency: "BDT",
      price: price.toString(),
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // YYYY-MM-DD
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "bdmart24" },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "BD",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 3,
        returnMethod: "https://schema.org/ReturnByMail",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: p.insideDhaka || 60,
          currency: "BDT",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 3,
            unitCode: "DAY",
          },
        },
      },
    },
  };

  // Facebook Catalog এর জন্য আলাদা সিম্পল schema
  const fbSchema = {
    "@context": "http://schema.org",
    "@type": "Product",
    name: p.title,
    description: htmlToText(p.description || ""),
    image: mainImg,
    url: url,
    sku: p.id,
    brand: "bdmart24",
    offers: {
      "@type": "Offer",
      price: price,
      priceCurrency: "BDT",
      availability: "http://schema.org/InStock",
    },
  };

  // Facebook Pixel Event
  const fbEvent = {
    content_name: p.title,
    content_ids: [p.id],
    content_type: "product",
    content_category: p.category?.name || "General",
    value: price,
    currency: "BDT",
  };

  return (
    <>
      {/* Google Schema */}
      <Script
        id="schema-google"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(googleSchema) }}
      />

      {/* Facebook Catalog Schema */}
      <Script
        id="schema-fb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(fbSchema) }}
      />

      <div className="container mx-auto px-4 py-8 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* ইমেজ গ্যালারি */}
          <div className="md:col-span-3">
            <Images
              title={p.title}
              mainImage={p.mainImage}
              imageGallery={p.imageGallery || []}
            />
          </div>

          {/* প্রাইস + কিনুন */}
          <div className="md:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold border-b-2 pb-4">
              {p.title}
            </h1>

            <KalapanaFont>
              <div className="my-6">
                <p className="text-2xl md:text-3xl">
                  মূল্যঃ{" "}
                  <span className="text-5xl font-bold text-purple-600">
                    {replaceNumbers(price.toString())}
                  </span>{" "}
                  টাকা
                  {savings > 0 && (
                    <>
                      <del className="text-gray-500 text-xl ml-3">
                        {replaceNumbers(p.regularPrice.toString())}
                      </del>
                    </>
                  )}
                </p>
              </div>
            </KalapanaFont>

            <BuyNowSection data={p} />
          </div>
        </div>

        {/* ডেসক্রিপশন */}
        <div className="mt-12">
          <ProductDescription description={p.description} />
        </div>

        {/* এক্সট্রা গ্যালারি */}
        {p.imageGallery && p.imageGallery.length > 0 && (
          <ProductImageGallery imageGallery={p.imageGallery} title={p.title} />
        )}

        {/* Facebook Pixel Track */}
        <FacebookEventTrac product={{ ...p, ...fbEvent }} />
      </div>
    </>
  );
}
