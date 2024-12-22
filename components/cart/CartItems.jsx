"use client";
import { useCart } from "@/context/CartContext";
import CartItem from "./CartItem";
export default function CartItems() {
  const { addToCart, reduceCartQty, cartItems, totalCartPrice } = useCart();
  if (cartItems?.length > 0) {
    return cartItems?.map((item) => <Item key={item.id} data={item} />);
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
    <CartItem
      data={data}
      productQty={data?.quantity}
      setProductQy={qtyHandler}
    />
  );
}
