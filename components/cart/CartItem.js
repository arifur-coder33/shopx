import { replaceNumbers } from "@/utils/engToBanNumber";
import Button from "../button";
import Imagecustom from "../images/ImageCustom";

export default function CartItem({data}){

    const {name,price,quantity}=data || {}
   const totalPrice=price*quantity
    return(
        <div className="grid grid-cols-12 gap-1 w-full text-[12px] text-slate-900 dark:text-slate-200 p-2 mt-2 border-2 items-center dark:border-slate-800 border-gray-500 rounded-md ">
            <div className="col-span-3">
              <Imagecustom w={75} h={75}/>
            </div>
            <div className="col-span-8 leading-none ">
                <h1 className="text-base line-clamp-1">{name}</h1>
                <div className="grid p-0 m-0 grid-cols-2">
                    <span >Size: xL</span>
                    <span >Size: black</span>
                    <span >পরিমান: {replaceNumbers(quantity.toString())}</span>
                    <span>মূল্য: {replaceNumbers(price.toString())} টাকা </span>

                </div>
                
            </div>
            <div className="col-span-1">
               <Button bgcolor={'bg-transparent hover:bg-transparent'} className={' text-slate-200 text-[12px]   '}><span className="bg-red-500/80 hover:bg-slate-700 rounded-full p-1 border-red-700 border">X</span> </Button>
            </div>
            <div className="col-span-12 text-center text-white bg-gray-500 dark:bg-slate-800">Total: {replaceNumbers(totalPrice.toString())} টাকা</div>
        </div>
    )
}