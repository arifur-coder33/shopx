export const revalidate = 60;
import {
  getProductBySlug,
  getProducts,
} from "@/backend/serverActions/productActions";

import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { getBase64ImageUrl } from "@/utils/getBase64";
import { convertImageToOG_cloudinary } from "@/utils/replaceImageurl";
import { htmlToText } from "html-to-text";
import Image from "next/image";
import Script from "next/script";

import dynamic from "next/dynamic"; // <-- Import dynamic
import { cache } from "react";
import ProductHeader from "../_components/ProductHeader";

// --- LAZY-LOADED COMPONENTS ---

const KalapanaFont = dynamic(() => import("@/components/KalapanaFont"));
const ProductImageGallery = dynamic(() =>
  import("../_components/ProductImageGallery")
);
const ProductDescription = dynamic(() =>
  import("@/components/products/productDescription")
);
const FacebookEventTrac = dynamic(() =>
  import("../_components/FacebookEventTrack")
);
const BuyNowSection = dynamic(() => import("./_components/BuyNowSection"));
export async function generateMetadata({ params }) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);
  const data = product?.data;

  if (!data) {
    return {
      title: `Product not found - ${process.env.NEXT_SHOP_NAME}`,
      description: "The product you are looking for could not be found.",
      openGraph: {
        title: "Product not found",
        description: "The product you are looking for could not be found.",
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/products/${slug}`,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Product not found",
        description: "The product you are looking for could not be found.",
      },
      robots: "noindex, nofollow",
    };
  }

  const {
    title,
    description,
    seoDescription,
    seoKeyWord,
    mainImage,
    category,
    regularPrice,
    discountPrice,
    id,
    thumbnail,
  } = data;
  const primaryImage = thumbnail?.name || mainImage;
  const imageUrl =
    cloudinaryMainImage(primaryImage, 800, 800) ||
    `${process.env.NEXT_PUBLIC_SITE_URL}/default-product-image.png`;

  const ogImageUrl =
    convertImageToOG_cloudinary(
      cloudinaryMainImage(primaryImage, 1200, 630),
      "t_og-image-width-convert"
    ) || `${process.env.NEXT_PUBLIC_SITE_URL}/images/site_logo_og.png`;
  console.log("ogImageUrl", ogImageUrl);
  const price = new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
  }).format(Number(discountPrice));

  const availability = "in stock"; // Ensure this field is included and valid
  const brandName = data.brand || process.env.NEXT_SHOP_NAME;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/product/${slug}`;

  return {
    title: `${title} - মাত্র ${price} টাকায়`,
    description:
      seoDescription ||
      description ||
      `${title} is a top-quality product from ${category?.name}. Order now at the best price!.`,
    keywords: [
      seoKeyWord,
      title,
      category?.name,
      "Buy online",
      "Affordable price",
      "Best quality products",
    ],

    openGraph: {
      title: `${title} - মাত্র ${price} টাকায়`,
      description: seoDescription || htmlToText(description),
      url,
      images: [
        {
          url: ogImageUrl, // 1200x630 for OG image
          // width: 800,
          // height: 800,
          alt: title,
        },
      ],
      product: {
        brand: brandName,
        availability: "in stock",
        condition: "new",
        retailer_item_id: id || "1111", // Ensure 'id' is being passed correctly here
        item_group_id: category?.name,
        price: {
          amount: price,
          currency: "BDT",
        },
      },
    },
    additionalMetaTags: [
      {
        property: "product:price:amount",
        content: discountPrice,
      },
      {
        property: "product:price:currency",
        content: "BDT",
      },
    ],
    twitter: {
      card: "summary_large_image",
      title: `${title} - Buy Online at ${price} TK`,
      description:
        seoDescription ||
        description ||
        `${title} is a premium product available for purchase.`,
      images: [
        {
          url: ogImageUrl, // 1200x630 for OG image
          alt: title,
        },
      ],
    },
    robots: "index, follow",
    alternates: {
      canonical: url,
    },
    other: {
      "product:price:amount": price,
      "product:price:currency": "BDT",
      "product:availability": "in stock",
      "product:brand": brandName,
      "product:category": category?.name || "General",
      "product:sku": id || "N/A",
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      productID: id,
      name: title,
      description: htmlToText(description) || `${title}`,
      url,
      image: [imageUrl],
      brand: {
        "@type": "Brand",
        name: brandName,
      },
      sku: id || "N/A",
      offers: [
        {
          "@type": "Offer",
          price: price,
          priceCurrency: "BDT",
          availability: `https://schema.org/${availability}`,
          itemCondition: "https://schema.org/NewCondition",
          url,
        },
      ],
      additionalProperty: [
        {
          "@type": "PropertyValue",
          propertyID: "item_group_id",
          value: category?.name || "General",
        },
      ],
    },
  };
}

export async function generateStaticParams() {
  const data = await getProducts();
  return data?.data.map((product) => ({
    slug: product.slug,
  }));
}
const getProductCached = cache(getProductBySlug);
const getBase64Cached = cache(getBase64ImageUrl);
export default async function ProductPage({ params }) {
  const getParams = await params;
  const { slug } = getParams;
  const { data } = await getProductCached(slug);

  const blurDataURL = await getBase64Cached(
    data?.thumbnail?.name || data?.mainImage
  );
  // const getProduct = unstable_cache(
  //   async () => {
  //     const data = await getProductBySlug(slug);
  //     return data?.data;
  //   },
  //   [slug],
  //   { revalidate: 60, tags: [`product-${slug}`] }
  // );

  const {
    id,
    title,
    regularPrice,
    imageGallery,
    discountPrice,
    description,
    mainImage,
    thumbnail,
    gallery,
    variations,
    category,
  } = data || {};
  const name = category?.name || "General";
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/product/${slug}`;
  const imageUrl =
    cloudinaryMainImage(thumbnail.name || mainImage, 800, 800) ||
    `${process.env.NEXT_PUBLIC_SITE_URL}/default-product-image.png`;
  const primaryImage = thumbnail?.name || mainImage;
  //for facebook product schema listing
  const schema = {
    "@context": "http://schema.org",
    "@type": "Product",
    name: title,
    description: htmlToText(description),
    image: imageUrl,
    url: url,
    sku: id,
    brand: "bdmart24",
    offers: {
      "@type": "Offer",
      price: discountPrice || regularPrice,
      priceCurrency: "BDT",
      availability: "http://schema.org/InStock",
    },
  };
  /// facebook event track
  const schemaEvent = {
    content_name: title,
    content_ids: [id],
    content_type: "product",
    content_category: name,
    value: discountPrice,
    currency: "BDT",
  };

  /// google product Listing
  const schemaGoogle = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: title,
    description: htmlToText(description),
    image: imageUrl,
    url: discountPrice,
    sku: id,
    brand: {
      "@type": "Brand",
      name: "BDMART24",
    },

    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: discountPrice,
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
    },
  };

  const mainProductImageId = thumbnail?.name || mainImage;

  // --- Add this line to generate the blur placeholder on the server ---

  return (
    <div className="mb-16">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <ProductHeader data={data}>
          <Image
            src={cloudinaryMainImage(mainProductImageId, 600, 600)}
            alt={title}
            fill={true} // Use fill for responsive sizing within the container
            priority={true}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="rounded-md object-contain"
            placeholder="blur"
            blurDataURL={blurDataURL}
          />
        </ProductHeader>
      </div>
      <ProductDescription description={description} />

      <FacebookEventTrac product={data} />
      <Script
        id="jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <Script
        id="jsonldforGoogle"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGoogle) }}
      />
    </div>
  );
}
