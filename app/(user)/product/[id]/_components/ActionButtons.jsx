import AddToCartButton from "@/components/products/addToCartButton";
import BuyNowButton from "@/components/products/buyNowButton";

export default function ActionButtons(){
    return (
        <div className="grid grid-cols-2 gap-2 mt-4 fixed bottom-1 left-0 w-full sm:static">
            {/* Add to cart button  */}

            <AddToCartButton className={" w-full    text-4xl"}   />

            {/* buy now button  */}
            <div className="relative ">
              <BuyNowButton   bgcolor="bg-sky-600" className={" w-full hover:bg-blue-700 text-white   text-4xl "} />

              <span className="animate-ping absolute -top-1 z-0 -left-1 h-3 w-3 rounded-full bg-purple-500 opacity-90"></span>
            </div>
          </div>
    )
}