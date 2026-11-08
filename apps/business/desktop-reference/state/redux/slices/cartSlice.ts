import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// Types
export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  stock_unit?: string;
  discount?: number;
}

interface CartState {
  items: CartItem[];
  discount: number; // absolute currency amount, not percentage
  tax: number; // absolute currency amount
  customer_id?: number;
}

const initialState: CartState = {
  items: [],
  discount: 0,
  tax: 0,
  customer_id: undefined,
};

// Helpers
export const calculateSubtotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => {
    const itemDiscount = item.discount ?? 0;
    return sum + item.price * item.quantity - itemDiscount;
  }, 0);
};

export const calculateTotal = (state: CartState): number => {
  const subtotal = calculateSubtotal(state.items);
  return Math.max(0, subtotal - state.discount + state.tax);
};

export const calculateChange = (
  state: CartState,
  amountTendered: number,
): number => {
  const total = calculateTotal(state);
  return Math.max(0, amountTendered - total);
};

// Slice
const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(
        (item) => item.product_id === action.payload.product_id,
      );

      if (existingItem) {
        existingItem.quantity += action.payload.quantity;

        // keep latest optional fields in sync
        existingItem.name = action.payload.name;
        existingItem.price = action.payload.price;
        existingItem.sku = action.payload.sku ?? existingItem.sku;
        existingItem.stock_unit =
          action.payload.stock_unit ?? existingItem.stock_unit;
      } else {
        state.items.push({
          ...action.payload,
          discount: action.payload.discount ?? 0,
        });
      }
    },

    updateQuantity: (
      state,
      action: PayloadAction<{ product_id: number; quantity: number }>,
    ) => {
      const item = state.items.find(
        (item) => item.product_id === action.payload.product_id,
      );

      if (!item) return;

      if (action.payload.quantity <= 0) {
        state.items = state.items.filter(
          (item) => item.product_id !== action.payload.product_id,
        );
      } else {
        item.quantity = action.payload.quantity;
      }
    },

    removeItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(
        (item) => item.product_id !== action.payload,
      );
    },

    clearCart: (state) => {
      state.items = [];
      state.discount = 0;
      state.tax = 0;
      state.customer_id = undefined;
    },

    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount = Math.max(0, action.payload || 0);
    },

    setTax: (state, action: PayloadAction<number>) => {
      state.tax = Math.max(0, action.payload || 0);
    },

    setCustomer: (state, action: PayloadAction<number | undefined>) => {
      state.customer_id = action.payload;
    },

    updateItemPrice: (
      state,
      action: PayloadAction<{ product_id: number; price: number }>,
    ) => {
      const item = state.items.find(
        (item) => item.product_id === action.payload.product_id,
      );
      if (item) {
        item.price = Math.max(0, action.payload.price);
      }
    },

    updateItemDiscount: (
      state,
      action: PayloadAction<{ product_id: number; discount: number }>,
    ) => {
      const item = state.items.find(
        (item) => item.product_id === action.payload.product_id,
      );
      if (item) {
        item.discount = Math.max(0, action.payload.discount);
      }
    },
  },
});

// Actions
export const {
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
  setDiscount,
  setTax,
  setCustomer,
  updateItemPrice,
  updateItemDiscount,
} = cartSlice.actions;

// Selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartDiscount = (state: { cart: CartState }) =>
  state.cart.discount;
export const selectCartTax = (state: { cart: CartState }) => state.cart.tax;
export const selectCartCustomer = (state: { cart: CartState }) =>
  state.cart.customer_id;
export const selectCartSubtotal = (state: { cart: CartState }) =>
  calculateSubtotal(state.cart.items);
export const selectCartTotal = (state: { cart: CartState }) =>
  calculateTotal(state.cart);

export default cartSlice.reducer;