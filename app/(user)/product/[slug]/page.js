export const dynamic = "force-static";
import {
  getProductBySlug,
  getProducts,
} from "@/backend/serverActions/productActions";
import KalapanaFont from "@/components/KalapanaFont";
import IncrementNDcrement from "@/components/products/incrementNDcrement";
import ProductDescription from "@/components/products/productDescription";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { unstable_cache } from "next/cache";
import ActionButtons from "./_components/ActionButtons";
import Images from "./_components/Images";

export async function generateMetadata({ params }) {
  const { slug } = params;

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
    images,
    category,
    regularPrice,
    discountPrice,
    id,
  } = data;

  const imageUrl =
    images[0]?.url ||
    `${process.env.NEXT_PUBLIC_SITE_URL}/default-product-image.png`;
  const price = discountPrice || regularPrice;
  const availability = data.stock > 0 ? "InStock" : "OutOfStock";
  const brandName = data.brand || process.env.NEXT_PUBLIC_SITE_URL;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/product/${slug}`;

  return {
    title: `${title} - Buy Online at ${price} TK`,
    description:
      description ||
      `${title} is a top-quality product from ${category?.name}. Order now at the best price!.`,
    keywords: [
      title,
      category?.name,
      "Buy online",
      "Affordable price",
      "Best quality products",
    ],
    openGraph: {
      title: `${title} - Buy Online at ${price} TK`,
      description:
        description ||
        `Shop ${title} from ${category?.name} at the best price.`,
      url,
      type: "product",
      images: [
        {
          url: imageUrl,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - Buy Online at ${price} TK`,
      description:
        description || `${title} is a premium product available for purchase.`,
      images: [
        {
          url: imageUrl,
          alt: title,
        },
      ],
    },
    robots: "index, follow",
    alternates: {
      canonical: url,
      languages: {
        "en-US": url,
        "bn-BD": `${url}?lang=bn`,
      },
    },
    other: {
      "product:price:amount": price.toString(),
      "product:price:currency": "BDT",
      "product:availability": availability,
      "product:brand": brandName,
      "product:category": category?.name || "General",
      "product:sku": id || "N/A",
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: title,
      description: description || `${title} is a high-quality product.`,
      image: [imageUrl],
      brand: {
        "@type": "Brand",
        name: brandName,
      },
      sku: id || "N/A",
      offers: {
        "@type": "Offer",
        price: price,
        priceCurrency: "BDT",
        availability: `https://schema.org/${availability}`,
        url,
      },
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
  const { slug } = await params;

  const getProduct = unstable_cache(
    async () => {
      const data = await getProductBySlug(slug);
      return data?.data;
    },
    [slug],
    { revalidate: 3600, tags: [slug] } // Use string array for tags
  );

  const data = await getProduct();

  const {
    id,
    title,
    regularPrice,
    images,
    discountPrice,
    description,
    category: { name },
  } = data;

  return (
    <div className="mb-16">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <div className="col-span-3">
          <Images title={title} images={images} />
        </div>
        <div className="col-span-2">
          <h1 className=" text-xl font-bold">{title}</h1>
          <KalapanaFont>
            <div className="dark:text-slate-300 text-2xl">
              <p>
                মূল্যঃ{" "}
                <span className="text-5xl text-purple">
                  {replaceNumbers((discountPrice || 0).toString())}
                </span>{" "}
                টাকা
              </p>
              <div className="flex flex-row items-center text-center">
                <label htmlFor="qtyinput">পরিমানঃ</label>
                <IncrementNDcrement />
              </div>
            </div>
          </KalapanaFont>
          <ActionButtons product={data} />
        </div>
      </div>
      <ProductDescription description={description} />
    </div>
  );
}
