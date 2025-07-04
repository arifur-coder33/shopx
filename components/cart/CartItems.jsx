"use client";
import { useCart } from "@/context/CartContext";
import CartItem from "./CartItem";
export default function CartItems() {
  const { addToCart, reduceCartQty, cartItems, totalCartPrice } = useCart();
  console.log("cartItems", cartItems);
  if (cartItems?.length > 0) {
    return cartItems?.map((item, index) => (
      <Item key={item.id + index} data={item} />
    ));
  }
}

function Item({ data }) {
  const { addToCart, reduceCartQty } = useCart();
  const qtyHandler = (qty, action) => {
    if (action === "increment") {
      addToCart(data);
    } else if (action === "decrement") {
      reduceCartQty(data);
    }
  };
  return (
    <CartItem {...data} productQty={data?.quantity} setProductQy={qtyHandler} />
  );
}
