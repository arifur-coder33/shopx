'use client'
import { ShoppingBag } from "lucide-react";
import CartItem from "./CartItem";
import KalapanaFont from "../KalapanaFont";
import { useCart } from "@/context/CartContext";
export default function CartPage(){
    const {cartItems}=useCart()
    return (
        <>
        <div className="flex flex-row text-purple dark:text-slate-200 font-bold"><ShoppingBag/> <KalapanaFont><span className="px-2  text-2xl">ব্যাগ</span></KalapanaFont></div>
        {
            cartItems.length>0 ? (
                cartItems.map(( item)=> <CartItem key={item.id} data={item}/>)
            ):'no item '
        }
         
        

        </>
              ) 
}