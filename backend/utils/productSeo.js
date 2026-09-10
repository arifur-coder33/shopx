import { cloudinaryDetailImage } from "@/utils/cloudinaryUrl";
import { htmlToText } from "html-to-text";

const clean = (value) => String(value || "").trim();
const finitePrice = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

export function productPlainText(value) {
  return htmlToText(clean(value), { wordwrap: false })
    .replace(/\s+/g, " ")
    .trim();
}

export function productVariationLabel(variation) {
  return (variation?.combinations || [])
    .map((item) => item?.variationValue?.value)
    .filter(Boolean)
    .join(" / ");
}

export function productSeoImages(product, siteUrl) {
  const media = [
    product?.thumbnail,
    ...(product?.gallery || []),
    ...(product?.variations || []).map((variation) => variation?.thumbnail),
  ].filter((item) => item?.name);
  const unique = Array.from(new Map(media.map((item) => [item.name, item])).values());
  const images = unique.map((item) => cloudinaryDetailImage(item.name, 1200));
  return images.length ? images : [`${siteUrl}/images/default.png`];
}

export function productSeoVariations(product) {
  return (product?.variations || [])
    .map((variation) => {
      const regularPrice = finitePrice(variation.regularPrice);
      const discountPrice = finitePrice(variation.discountPrice);
      const price =
        discountPrice && regularPrice && discountPrice < regularPrice
          ? discountPrice
          : regularPrice || discountPrice;
      if (!price) return null;
      const stock = Math.max(0, Number(variation.stock) || 0);
      return {
        ...variation,
        price,
        regularPrice,
        stock,
        label: productVariationLabel(variation),
        availability:
          stock > 0
            ? "https://schema.org/InStock"
            : product?.allowOutOfStockOrder
              ? "https://schema.org/PreOrder"
              : "https://schema.org/OutOfStock",
      };
    })
    .filter(Boolean);
}

const variationProperty = (name) => {
  const normalized = clean(name).toLowerCase();
  if (["color", "colour", "রং", "রঙ"].includes(normalized)) return "https://schema.org/color";
  if (["size", "সাইজ"].includes(normalized)) return "https://schema.org/size";
  if (["material", "ম্যাটেরিয়াল"].includes(normalized)) return "https://schema.org/material";
  if (["pattern", "প্যাটার্ন"].includes(normalized)) return "https://schema.org/pattern";
  return null;
};

const videoSource = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be" || host.endsWith("youtube.com")) {
      const id =
        host === "youtu.be"
          ? url.pathname.split("/").filter(Boolean)[0]
          : url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
      return id ? { embedUrl: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    if (host.endsWith("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).pop();
      return id ? { embedUrl: `https://player.vimeo.com/video/${id}` } : null;
    }
    if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return { contentUrl: url.toString() };
    return { embedUrl: url.toString() };
  } catch {
    return null;
  }
};

export function buildProductSeo({ product, siteUrl, siteName }) {
  const url = `${siteUrl}/product/${encodeURIComponent(product.slug)}`;
  const description =
    productPlainText(product.seoDescription || product.description) ||
    `${siteName}-এ ${product.title} অনলাইনে অর্ডার করুন।`;
  const images = productSeoImages(product, siteUrl);
  const variations = productSeoVariations(product);
  const lowestPrice = variations.length
    ? Math.min(...variations.map((variation) => variation.price))
    : null;
  const highestPrice = variations.length
    ? Math.max(...variations.map((variation) => variation.price))
    : null;
  const brand = { "@type": "Brand", name: siteName };
  const seller = { "@type": "Organization", name: siteName, url: `${siteUrl}/` };
  const productId = clean(product.productCode || product.id);

  const offerFor = (variation) => ({
    "@type": "Offer",
    url: `${url}?sku=${encodeURIComponent(variation.sku)}`,
    priceCurrency: "BDT",
    price: variation.price,
    itemCondition: "https://schema.org/NewCondition",
    availability: variation.availability,
    seller,
  });

  const hasRealVariants = Boolean(product.hasVariations && variations.length > 1);
  const mainEntity = hasRealVariants
    ? {
        "@type": "ProductGroup",
        "@id": `${url}#product`,
        name: product.title,
        description,
        url,
        productGroupID: productId,
        image: images,
        brand,
        ...(product.category?.name && { category: product.category.name }),
        variesBy: Array.from(
          new Set(
            variations.flatMap((variation) =>
              variation.combinations
                .map((item) => variationProperty(item?.variationName?.name))
                .filter(Boolean),
            ),
          ),
        ),
        hasVariant: variations.map((variation) => ({
          "@type": "Product",
          name: variation.label
            ? `${product.title} - ${variation.label}`
            : `${product.title} - ${variation.sku}`,
          sku: variation.sku,
          image: variation.thumbnail?.name
            ? [cloudinaryDetailImage(variation.thumbnail.name, 1200), ...images]
            : images,
          url: `${url}?sku=${encodeURIComponent(variation.sku)}`,
          offers: offerFor(variation),
        })),
      }
    : {
        "@type": "Product",
        "@id": `${url}#product`,
        name: product.title,
        description,
        url,
        image: images,
        sku: variations[0]?.sku || productId,
        brand,
        ...(product.category?.name && { category: product.category.name }),
        ...(variations[0] && { offers: offerFor(variations[0]) }),
      };

  const breadcrumbItems = [
    { name: "হোম", url: `${siteUrl}/` },
    ...(product.category?.name
      ? [{
          name: product.category.name,
          url: `${siteUrl}/category/${String(product.category.fullPath || product.category.slug)
            .split("/")
            .filter(Boolean)
            .map(encodeURIComponent)
            .join("/")}`,
        }]
      : []),
    { name: product.title, url },
  ];

  const videos = (product.videos || [])
    .map((video, index) => {
      const source = videoSource(video.url);
      if (!source) return null;
      return {
        "@type": "VideoObject",
        "@id": `${url}#video-${index + 1}`,
        name: clean(video.header) || `${product.title} ভিডিও ${index + 1}`,
        description: `${clean(video.header) || product.title} — ${description}`.slice(0, 300),
        thumbnailUrl: [images[0]],
        uploadDate: new Date(video.createdAt || product.updatedAt || product.createdAt).toISOString(),
        ...source,
        mainEntityOfPage: url,
      };
    })
    .filter(Boolean);

  return {
    url,
    description,
    images,
    variations,
    lowestPrice,
    highestPrice,
    availability: variations.some((variation) => variation.stock > 0)
      ? "in stock"
      : product.allowOutOfStockOrder
        ? "preorder"
        : "out of stock",
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ItemPage",
          "@id": `${url}#webpage`,
          url,
          name: product.title,
          description,
          primaryImageOfPage: images[0],
          mainEntity: { "@id": `${url}#product` },
          inLanguage: "bn-BD",
        },
        mainEntity,
        {
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbItems.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
          })),
        },
        ...videos,
      ],
    },
  };
}
