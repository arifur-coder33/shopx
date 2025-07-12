const { useCart } = require("@/context/CartContext");
import CartItem from "./CartItem";

export default function CartItemQtyUpdate({ data }) {
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
