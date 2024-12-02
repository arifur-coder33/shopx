import {
  getProductBySlug,
  getProducts,
} from "@/backend/serverActions/productActions";
import KalapanaFont from "@/components/KalapanaFont";
import IncrementNDcrement from "@/components/products/incrementNDcrement";
import ProductDescription from "@/components/products/productDescription";
import { replaceNumbers } from "@/utils/engToBanNumber";
import ActionButtons from "./_components/ActionButtons";
import Images from "./_components/Images";

export async function generateStaticParams() {
  const data = await getProducts();

  // Render the first 10 posts at build time
  return data?.data.slice(0, 10).map((product) => ({
    slug: product.slug,
  }));
}
export default async function ProductPage({ params }) {
  const { id } = await params;
  const data = await getProductBySlug(id);

  const {
    title,
    regularPrice,
    images,
    discountPrice,
    description,
    category: { name },
  } = data?.data;

  return (
    <div className="mb-16">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {/* product Image  */}
        <div className="col-span-3">
          <Images images={images} />
        </div>
        <div className="col-span-2">
          {/* product Name */}
          <h1 className=" text-xl font-bold">{title}</h1>
          {/* Price  & qty  */}
          <KalapanaFont>
            <div className=" dark:text-slate-300 text-2xl ">
              <p>
                মূল্যঃ{" "}
                <span className="text-5xl text-purple">
                  {replaceNumbers(discountPrice.toString())}
                </span>{" "}
                টাকা
              </p>

              <div className="flex flex-row items-center text-center">
                <label htmlFor="qtyinput">পরিমানঃ</label>
                <IncrementNDcrement />{" "}
              </div>
            </div>
          </KalapanaFont>
          {/* Add to cart and buy now button  */}
          <ActionButtons product={data?.data} productId={id} />
        </div>
      </div>
      <ProductDescription description={description} />
    </div>
  );
}
