"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedCart = localStorage.getItem("cartItems");
      if (storedCart) {
        setCartItems(JSON.parse(storedCart));
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  // ✅ Helper to safely compare two cart items
  const isSameCartItem = (a, b) => {
    const sameProduct = a.id === b.id;
    const aVarId = a.variation?.id || null;
    const bVarId = b.variation?.id || null;
    return sameProduct && aVarId === bVarId;
  };

  // ✅ Add to cart
  const addToCart = (product, qty) => {
    console.log("product", product);

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) =>
        isSameCartItem(item, product)
      );
      if (existingItem) {
        return prevItems.map((item) =>
          isSameCartItem(item, product)
            ? {
                ...item,
                quantity: qty ? item.quantity + qty : item.quantity + 1,
              }
            : item
        );
      } else {
        return [...prevItems, { ...product, quantity: qty ? qty : 1 }];
      }
    });
  };

  // ✅ Reduce quantity
  const reduceCartQty = (product) => {
    setCartItems((prevItems) =>
      prevItems
        .map((item) =>
          isSameCartItem(item, product)
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // ✅ Remove from cart
  const removeFromCart = (product) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => !isSameCartItem(item, product))
    );
  };

  const clearCart = () => setCartItems([]);

  // ✅ Totals
  const totalCartQuantity = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  const totalCartPrice = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total +
          (item.discountPrice || item.regularPrice || 0) * item.quantity,
        0
      ),
    [cartItems]
  );

  const totalCartRegularPrice = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + (item.regularPrice || 0) * item.quantity,
        0
      ),
    [cartItems]
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        reduceCartQty,
        removeFromCart,
        clearCart,
        totalCartQuantity,
        totalCartPrice,
        totalCartRegularPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
