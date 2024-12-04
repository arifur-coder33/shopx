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

  if (!data) {
    return <p>Product not found</p>; // Handle 404 cases
  }

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
