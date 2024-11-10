import { customLoader } from "@/components/images/Images-Loader";
import KalapanaFont from "@/components/KalapanaFont";
import AddToCartButton from "@/components/products/addToCartButton";
import BuyNowButton from "@/components/products/buyNowButton";
import IncrementNDcrement from "@/components/products/incrementNDcrement";
import { replaceNumbers } from "@/utils/engToBanNumber";
import Image from "next/image";
export default async function ProductPage({ params }) {
  const { id } = await params;
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
      <div className="col-span-3">
        {/* <Image
          src={
            "/photo-1556637640-2c80d3201be8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c25lYWtlcnxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=75"
          }
          sizes="(max-width: 480px) 300px, 
          (max-width: 1024px) 600px, 
          600px"
          loader={customLoader}
          className=" rounded-md "
          placeholder="blur"
          blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
          width={650}
          height={650}
          alt="image"
          priority
        /> */}

        <Image
          src="/photo-1556637640-2c80d3201be8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c25lYWtlcnxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=75"
          sizes="(max-width: 480px) 300px, (max-width: 768px) 500px, 650px"
          loader={customLoader}
          className="rounded-md"
          placeholder="blur"
          blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
          width={650}
          height={650}
          alt="image"
          priority
        />

        <div className="flex flex-row gap-1 ">
          <ImageGallery />
          <ImageGallery />
          <ImageGallery />
          <ImageGallery />
        </div>
      </div>
      <div className="col-span-2">
        {/* product Name */}
        <p>
          বাটা ক্লাসিক স্নাকারস (সাদা) ক্লাসিক স্নাকারস ক্লাসিক স্নাকারস ক্লাসিক
          স্নাকারস ক্লাসিক স্নাকারস ক্লাসিক স্নাকারস
        </p>
        {/* Price  */}
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

        <div className="grid grid-cols-2 gap-2 mt-4">
          {/* buy now button  */}
          <div className="relative ">
            <BuyNowButton className={" w-full  pt-4   text-4xl"} />

            <span className="animate-ping absolute -top-1 z-0 -right-1 h-3 w-3 rounded-full bg-purple-500 opacity-90"></span>
          </div>

          {/* Add to cart button  */}

          <AddToCartButton
            bgcolor="bg-sky-600"
            className={" w-full hover:bg-sky-500 text-white   text-4xl"}
          />
        </div>
      </div>
    </div>
  );
}

export function ImageGallery() {
  return (
    <Image
      src={
        "/photo-1556637640-2c80d3201be8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c25lYWtlcnxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=150&q=50"
      }
      loader={customLoader}
      className=" rounded-md w-36"
      placeholder="blur"
      blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
      width={100}
      height={100}
      alt="image"
    />
  );
}
