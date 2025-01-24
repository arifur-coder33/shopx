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
import Script from "next/script";
import BuyNowSection from "./_components/BuyNowSection";
import Images from "./_components/Images";
import { ProductImageGallery } from "./_components/Images/ProductImagegallery";

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
  } = data;

  const imageUrl =
    cloudinaryMainImage(mainImage, 800, 800) ||
    `${process.env.NEXT_PUBLIC_SITE_URL}/default-product-image.png`;

  const ogImageUrl =
    convertImageToOG_cloudinary(
      cloudinaryMainImage(mainImage, 1200, 630),
      "t_to_og"
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

export async function generateStaticParams() {
  const data = await getProducts();
  return data?.data.map((product) => ({
    slug: product.slug,
  }));
}

export default async function ProductPage({ params }) {
  const getParams = await params;
  const { slug } = getParams;

  // const getProduct = unstable_cache(
  //   async () => {
  //     const data = await getProductBySlug(slug);
  //     return data?.data;
  //   },
  //   [slug],
  //   { revalidate: 60, tags: [`product-${slug}`] }
  // );

  const { data } = await getProductBySlug(slug);
  const {
    id,
    title,
    regularPrice,
    imageGallery,
    discountPrice,
    description,
    mainImage,

    category: { name },
  } = data;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/product/${slug}`;
  const imageUrl =
    cloudinaryMainImage(mainImage, 800, 800) ||
    `${process.env.NEXT_PUBLIC_SITE_URL}/default-product-image.png`;

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

  // Fire the event when the component renders
  if (typeof window !== "undefined" && typeof fbq !== "undefined") {
    fbq("track", "ViewContent", schemaEvent);
    console.log("facebook event fire");
  }
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

  return (
    <div className="mb-16">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <div className="col-span-3">
          <Images
            title={title}
            mainImage={mainImage}
            imageGallery={imageGallery}
          />
        </div>
        <div className="col-span-2 mt-2">
          <h1 className="text-4xl font-bold border-b-2">{title}</h1>
          <KalapanaFont>
            <p className="text-2xl dark:text-slate-300 mt-4 relative">
              মূল্যঃ{" "}
              <span className="text-4xl md:text-5xl text-purple">
                {replaceNumbers((discountPrice || 0).toString())}
              </span>{" "}
              টাকা{" "}
              <del className="price-del text-xl">
                {replaceNumbers((regularPrice || 0).toString())}
              </del>
              <span className="leading-[16px] md:leading-8 p-2 bg-orange-500 text-slate-100 px-2 ml-2 text-xl md:text-3xl border-dotted border-4 dark:border-slate-900 border-slate-100 -rotate-[30deg] absolute right-0 -top-4 text-center rounded-full sm:h-28 sm:w-28 w-[80px] h-[80px]">
                বাঁচলো{" "}
                <span className="font-bold">
                  {replaceNumbers((regularPrice - discountPrice).toString())}
                </span>{" "}
                <span className="text-base"> টাকা</span>
              </span>
            </p>
          </KalapanaFont>
          <BuyNowSection data={data} />
        </div>
      </div>
      <ProductDescription description={description} />
      <ProductImageGallery imageGallery={imageGallery} title={title} />
      <Script
        id="jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {/* <Script
        id="eventSchema"
        dangerouslySetInnerHTML={{
          __html: `
            if (typeof fbq !== 'undefined') {
              fbq('track', 'ViewContent', ${JSON.stringify(schemaEvent)});
            }else {
        console.warn('Meta Pixel is not loaded.');
      }
          `,
        }}
      /> */}

      <Script
        id="jsonldforGoogle"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGoogle) }}
      />
    </div>
  );
}
