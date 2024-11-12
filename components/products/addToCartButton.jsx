'use client'
import Button from "../button";
import KalapanaFont from "../KalapanaFont";
import { useCart } from "@/context/CartContext";
export default function AddToCartButton(props) {
  const {addToCart} =useCart()



  const handleAddToCart = () => {

    addToCart({name:'Iphone 16 pro',price:16500, id:'1'});

  };
  return (

 
     <Button onClick={handleAddToCart} {...props}>
      <KalapanaFont>ব্যাগে রাখুন</KalapanaFont>{" "}  
    </Button>

  );
}
