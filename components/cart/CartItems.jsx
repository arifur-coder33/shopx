"use client";
import { useCart } from "@/context/CartContext";
import CartItem from "./CartItem";
export default function CartItems() {
  const { cartItems } = useCart();

  if (cartItems?.length > 0) {
    return cartItems.map((item) => (
      <Item key={`${item.id}:${item.variation?.id || "default"}`} data={item} />
    ));
  }
  return null;
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
