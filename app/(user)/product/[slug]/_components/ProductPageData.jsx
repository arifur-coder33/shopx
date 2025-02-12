import KalapanaFont from "@/components/KalapanaFont";
import ProductDescription from "@/components/products/productDescription";
import { replaceNumbers } from "@/utils/engToBanNumber";
import BuyNowSection from "./BuyNowSection";
import Images from "./Images";
import { ProductImageGallery } from "./Images/ProductImagegallery";

export default function ProductPageData({ data }) {
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
  return (
    <>
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
    </>
  );
}
