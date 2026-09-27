"use client";
import { useCart } from "@/context/CartContext";
import CartItem from "./CartItem";

export default function CartItems({ itemDiscounts = [], scopedOffers = [] }) {
  const { cartItems } = useCart();

  if (!cartItems?.length) return null;
  return cartItems.map((item) => {
    const productId = item.productId || item.id;
    const campaignOffer = itemDiscounts.find((offer) =>
      offer.isProductSpecific && offer.productId === productId &&
      (!offer.variationId || offer.variationId === item.variation?.id),
    );
    const campaignRules = [
      ...(campaignOffer ? [campaignOffer] : []),
      ...scopedOffers.filter((offer) => offer.productIds?.includes(productId)),
    ];
    return <Item key={`${item.id}:${item.variation?.id || "default"}`} data={item} campaignOffer={campaignOffer} campaignRules={campaignRules} />;
  });
}

function Item({ data, campaignOffer, campaignRules }) {
  const { addToCart, reduceCartQty } = useCart();
  const qtyHandler = (qty, action) => {
    if (action === "increment") addToCart(data);
    else if (action === "decrement") reduceCartQty(data);
  };
  return (
    <CartItem {...data} campaignOffer={campaignOffer} campaignRules={campaignRules} productQty={data?.quantity} setProductQy={qtyHandler} />
  );
}