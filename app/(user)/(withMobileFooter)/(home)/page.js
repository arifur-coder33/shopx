import { getPublicSiteIdentity } from "@/backend/services/siteAppearanceService";
import { getSiteUrl } from "@/lib/siteUrl";
import { Suspense } from "react";
import HeroSlider from "./_components/HeroSlider";
import HomeStorefront from "./_components/HomeStorefront";

export const revalidate = 60;
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const siteUrl = await getSiteUrl();
  const {
    name: siteName,
    seoTitle,
    seoDescription,
    logoUrl,
  } = await getPublicSiteIdentity();

  return {
    title: { absolute: seoTitle },
    description: seoDescription,
    keywords: `${siteName}, shopping in Bangladesh, online shopping in Bangladesh, মেশিনারি পণ্য, ফ্যাশন পণ্য, ইলেকট্রনিক্স, গ্যাজেট, অনলাইন শপ, ডিসকাউন্ট, machinery products, fashion items, electronics, gadgets, online store`,
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: siteUrl,
      type: "website",
      ...(logoUrl && {
        images: [{ url: logoUrl, width: 1200, height: 630, alt: seoTitle }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      site: siteUrl,
      title: seoTitle,
      description: seoDescription,
    },
    alternates: {
      canonical: siteUrl,
    },
  };
}

export default async function Home() {
  // const data = await prisma.product.findMany();

  return (
    <>
      <HeroSlider />
      <Suspense fallback={<HomeProductsSkeleton />}>
        <HomeStorefront />
      </Suspense>
    </>
  );
}

function HomeProductsSkeleton() {
  return (
    <div className="mt-5 space-y-7" aria-label="পণ্য লোড হচ্ছে">
      <section>
        <div className="mb-3 h-8 w-52 animate-pulse rounded-lg bg-surface-muted" />
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="aspect-square animate-pulse rounded-xl bg-surface-muted"
            />
          ))}
        </div>
      </section>
      <section>
        <div className="mb-3 h-8 w-32 animate-pulse rounded-lg bg-surface-muted" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="aspect-[3/4] animate-pulse rounded-brand bg-surface-muted"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
