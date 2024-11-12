
import KalapanaFont from "@/components/KalapanaFont";
import IncrementNDcrement from "@/components/products/incrementNDcrement";
import ProductDescription from "@/components/products/productDescription";
import { replaceNumbers } from "@/utils/engToBanNumber";
import Images from "./_components/Images";
import ActionButtons from "./_components/ActionButtons";
export default async function ProductPage({ params }) {
  const { id } = await params;
  return (
    <div className="mb-16">

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {/* product Image  */}
        <div className="col-span-3">
        <Images/>
        </div>
        <div className="col-span-2">
          {/* product Name */}
          <h1 className=" text-xl font-bold">
            বাটা ক্লাসিক স্নাকারস (সাদা) ক্লাসিক স্নাকারস ক্লাসিক স্নাকারস
            ক্লাসিক স্নাকারস ক্লাসিক স্নাকারস ক্লাসিক স্নাকারস
          </h1>
          {/* Price  & qty  */}
          <KalapanaFont>
            <div className=" dark:text-slate-300 text-2xl ">
              <p>
                মূল্যঃ{" "}
                <span className="text-5xl text-purple">
                  {replaceNumbers("399")}
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
          <ActionButtons/>
        </div>
      </div>
      <ProductDescription />
    </div>
  );
}


