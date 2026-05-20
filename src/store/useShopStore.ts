"use client";

import { create } from "zustand";

import { CartItem, UserProfile } from "@/lib/types";

interface ShopState {
  cart: CartItem[];
  wishlist: string[];
  recentlyViewed: string[];
  token: string | null;
  user: UserProfile | null;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, qty: number) => void;
  setWishlist: (productIds: string[]) => void;
  toggleWishlist: (productId: string) => void;
  addRecentlyViewed: (productId: string) => void;
  setAuth: (payload: { user: UserProfile; token?: string | null }) => void;
  logout: () => void;
  clearCart: () => void;
}

export const useShopStore = create<ShopState>()((set) => ({
  cart: [],
  wishlist: [],
  recentlyViewed: [],
  token: null,
  user: null,
  addToCart: (item) =>
    set((state) => {
      const existing = state.cart.find(
        (entry) => entry.productId === item.productId && entry.size === item.size
      );

      if (existing) {
        return {
          cart: state.cart.map((entry) =>
            entry.productId === item.productId && entry.size === item.size
              ? { ...entry, qty: entry.qty + item.qty }
              : entry
          )
        };
      }

      return { cart: [...state.cart, item] };
    }),
  removeFromCart: (productId, size) =>
    set((state) => ({
      cart: state.cart.filter((entry) => !(entry.productId === productId && entry.size === size))
    })),
  updateQuantity: (productId, size, qty) =>
    set((state) => ({
      cart: state.cart.map((entry) =>
        entry.productId === productId && entry.size === size
          ? { ...entry, qty: Math.max(1, qty) }
          : entry
      )
    })),
  setWishlist: (productIds) =>
    set(() => ({
      wishlist: Array.from(
        new Set(productIds.filter((productId) => typeof productId === "string" && productId.trim()))
      )
    })),
  toggleWishlist: (productId) =>
    set((state) => ({
      wishlist: state.wishlist.includes(productId)
        ? state.wishlist.filter((id) => id !== productId)
        : [...state.wishlist, productId]
    })),
  addRecentlyViewed: (productId) =>
    set((state) => {
      const next = [productId, ...state.recentlyViewed.filter((id) => id !== productId)];
      return { recentlyViewed: next.slice(0, 8) };
    }),
  setAuth: ({ token, user }) => set({ token: token || "session", user }),
  logout: () => set({ token: null, user: null, wishlist: [] }),
  clearCart: () => set({ cart: [] })
}));
