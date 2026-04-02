// export const revalidate = 60;
export const dynamic = "force-static"; // Ensures the page is statically generated

import { getProductBySlug } from "@/backend/serverActions/productActions";

import { cloudinaryMainImage, getBase64ImageUrl } from "@/utils/cloudinaryUrl";
import { convertImageToOG_cloudinary } from "@/utils/replaceImageurl";
import { htmlToText } from "html-to-text";
import Script from "next/script";
import ProductDataView from "../_components/ProductDataView";

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
      "t_og-image-width-convert",
    ) || `${process.env.NEXT_PUBLIC_SITE_URL}/images/site_logo_og.png`;

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

// export async function generateStaticParams() {
//   const { data: products } = await getProducts();
//   return products.map((product) => ({
//     slug: product.slug,
//   }));
// }

export default async function ProductPage({ params }) {
  const getParams = await params;
  const { slug } = getParams;
  const { success, data } = await getProductBySlug(slug);
  if (!success) {
    // Handle error case, e.g., show a not found message
    return <div>Error: {error}</div>;
  }

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
  const blurDataURL = await getBase64ImageUrl(primaryImage);
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

  // --- Add this line to generate the blur placeholder on the server ---

  return (
    <div className="mb-16">
      <ProductDataView data={data} blurDataURL={blurDataURL} />
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
