import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
  setDiscount,
  setTax,
  setCustomer,
  updateItemPrice,
  updateItemDiscount,
  selectCartItems,
  selectCartDiscount,
  selectCartTax,
  selectCartCustomer,
  selectCartSubtotal,
  selectCartTotal,
  type CartItem,
} from "@/redux/slices/cartSlice";

export const useReduxCart = () => {
  const dispatch = useAppDispatch();

  const items = useAppSelector(selectCartItems);
  const discount = useAppSelector(selectCartDiscount);
  const tax = useAppSelector(selectCartTax);
  const customerId = useAppSelector(selectCartCustomer);
  const subtotal = useAppSelector(selectCartSubtotal);
  const total = useAppSelector(selectCartTotal);

  const addToCart = useCallback(
    (item: CartItem) => {
      dispatch(addItem(item));
    },
    [dispatch],
  );

  const updateItemQuantity = useCallback(
    (productId: number, quantity: number) => {
      dispatch(updateQuantity({ product_id: productId, quantity }));
    },
    [dispatch],
  );

  const removeFromCart = useCallback(
    (productId: number) => {
      dispatch(removeItem(productId));
    },
    [dispatch],
  );

  const clearCartItems = useCallback(() => {
    dispatch(clearCart());
  }, [dispatch]);

  const applyDiscount = useCallback(
    (amount: number) => {
      dispatch(setDiscount(amount));
    },
    [dispatch],
  );

  const applyTax = useCallback(
    (amount: number) => {
      dispatch(setTax(amount));
    },
    [dispatch],
  );

  const assignCustomer = useCallback(
    (customerId?: number) => {
      dispatch(setCustomer(customerId));
    },
    [dispatch],
  );

  const updateCartItemPrice = useCallback(
    (productId: number, price: number) => {
      dispatch(updateItemPrice({ product_id: productId, price }));
    },
    [dispatch],
  );

  const updateCartItemDiscount = useCallback(
    (productId: number, discount: number) => {
      dispatch(updateItemDiscount({ product_id: productId, discount }));
    },
    [dispatch],
  );

  const getItemCount = useCallback(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  const getLineCount = useCallback(() => {
    return items.length;
  }, [items]);

  const getItem = useCallback(
    (productId: number) => {
      return items.find((item) => item.product_id === productId);
    },
    [items],
  );

  return {
    items,
    discount,
    tax,
    customerId,
    subtotal,
    total,
    addToCart,
    updateItemQuantity,
    removeFromCart,
    clearCart: clearCartItems,
    applyDiscount,
    applyTax,
    assignCustomer,
    updateCartItemPrice,
    updateCartItemDiscount,
    getItemCount,
    getLineCount,
    getItem,
  };
};